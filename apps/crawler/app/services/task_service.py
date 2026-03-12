import time
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from app.models.task import CrawlTask
from app.models.result import CrawlResult
from app.extensions import redis_client
from app.services.spider_service import SpiderService
from app.services.stats_service import StatsService
from app.services.scheduler_service import SchedulerService
from app.services.validation import ValidationService
from app.spiders.base import CancelledError

logger = logging.getLogger(__name__)

RUNNING_KEY = 'crawler:running'
DEDUP_KEY_PREFIX = 'crawler:dedup:'
CANCEL_KEY_PREFIX = 'crawler:cancel:'

# 模块级线程池，在 create_app 时初始化
_executor: ThreadPoolExecutor | None = None


def init_executor(app):
    """初始化线程池，max_workers = CRAWLER_CONCURRENT"""
    global _executor
    max_workers = app.config.get('CRAWLER_CONCURRENT', 5)
    _executor = ThreadPoolExecutor(max_workers=max_workers)
    logger.info(f'ThreadPoolExecutor initialized with max_workers={max_workers}')


class TaskService:
    """任务管理服务"""

    @staticmethod
    def create_task(data: dict) -> CrawlTask | dict:
        error = ValidationService.validate_task_data(data, is_create=True)
        if error:
            return {'error': error}

        task = CrawlTask(
            name=data['name'],
            spider_name=data['spiderName'],
            target_url=data['targetUrl'],
            cron_expr=data.get('cronExpr'),
            config=data.get('config'),
            enabled=data.get('enabled', True),
        )
        task.save()
        SchedulerService.sync_task(task)
        return task

    @staticmethod
    def get_task(task_id: str) -> CrawlTask | None:
        return CrawlTask.find_by_id(task_id)

    @staticmethod
    def list_tasks(page: int = 1, page_size: int = 10, keyword: str = ''):
        # 构建查询条件
        query = {}
        if keyword:
            query['name'] = {'$regex': keyword, '$options': 'i'}
        
        items, total = CrawlTask.find_paginated(
            query,
            page,
            page_size
        )
        return {
            'pageData': [t.to_dict() for t in items],
            'total': total,
        }

    @staticmethod
    def update_task(task_id: str, data: dict) -> CrawlTask | dict | None:
        task = CrawlTask.find_by_id(task_id)
        if not task:
            return None

        error = ValidationService.validate_task_data(data, is_create=False)
        if error:
            return {'error': error}

        field_map = {
            'name': 'name',
            'targetUrl': 'target_url',
            'cronExpr': 'cron_expr',
            'config': 'config',
            'enabled': 'enabled',
        }
        for camel, snake in field_map.items():
            if camel in data:
                setattr(task, snake, data[camel])
        task.save()
        SchedulerService.sync_task(task)
        return task

    @staticmethod
    def delete_task(task_id: str) -> bool:
        task = CrawlTask.find_by_id(task_id)
        if not task:
            return False
        CrawlResult.delete_by_task(task_id)
        SchedulerService.unregister_task(task_id)
        task.delete()
        # 清除去重集合
        redis_client.delete(f'{DEDUP_KEY_PREFIX}{task_id}')
        # 清除统计数据
        StatsService.clear_task_stats(task_id)
        # 清除取消标志
        redis_client.delete(f'{CANCEL_KEY_PREFIX}{task_id}')
        return True

    @staticmethod
    def _check_dedup(task_id: str, url: str) -> bool:
        """检查 URL 是否已爬取，返回 True 表示已存在应跳过"""
        return bool(redis_client.sismember(f'{DEDUP_KEY_PREFIX}{task_id}', url))

    @staticmethod
    def _add_dedup(task_id: str, url: str) -> None:
        """添加 URL 到去重集合"""
        redis_client.sadd(f'{DEDUP_KEY_PREFIX}{task_id}', url)

    @staticmethod
    def clear_dedup(task_id: str) -> bool:
        """清除任务的去重记录，返回是否有记录被清除"""
        return redis_client.delete(f'{DEDUP_KEY_PREFIX}{task_id}') > 0

    @staticmethod
    def clear_results(task_id: str) -> int:
        """清除任务的所有爬取结果及关联的增强结果，返回删除的记录数"""
        from app.models.enriched_result import EnrichedResult
        count = CrawlResult.count_by_task(task_id)
        CrawlResult.delete_by_task(task_id)
        EnrichedResult.delete_by_task(task_id)
        return count

    @staticmethod
    def stop_task(task_id: str, force: bool = False) -> dict:
        """设置取消标志，等待爬虫检测并停止。
        如果任务不在 Redis 运行集合中（线程可能已崩溃），直接重置状态。
        force=True 时，无论线程状态如何，直接强制重置为 cancelled。
        """
        task = CrawlTask.find_by_id(task_id)
        if not task:
            return {'error': '任务不存在'}
        if task.status != 'running':
            logger.info(f'[Stop] 任务 {task_id} 状态为 {task.status}，非 running')
            return {'error': '任务未在运行'}

        cancel_key = f'{CANCEL_KEY_PREFIX}{task_id}'
        actually_running = redis_client.sismember(RUNNING_KEY, task_id)
        logger.info(f'[Stop] 任务 {task_id}: DB status={task.status}, in Redis running set={actually_running}, force={force}')

        if force or not actually_running:
            # 强制停止：直接重置状态，清理 Redis
            task.status = 'cancelled'
            task.save()
            redis_client.delete(cancel_key)
            redis_client.srem(RUNNING_KEY, task_id)
            reason = '强制停止' if force else '线程已结束但状态未更新'
            logger.warning(f'[Stop] 任务 {task_id} {reason}，已重置为 cancelled')
            return {'message': '任务已强制停止', 'taskId': task_id, 'forced': True}

        # 设置取消标志
        redis_client.setex(cancel_key, 3600, '1')
        flag_exists = redis_client.exists(cancel_key)
        logger.info(f'[Stop] 任务 {task_id}: 取消标志已设置, exists={flag_exists}, key={cancel_key}')
        return {'message': '停止信号已发送', 'taskId': task_id, 'forced': False}

    @staticmethod
    def run_task(task_id: str, app) -> dict:
        """在线程池中执行爬虫任务，通过 Redis 控制并发"""
        task = CrawlTask.find_by_id(task_id)
        if not task:
            return {'error': '任务不存在'}
        if task.status == 'running':
            return {'error': '任务正在运行中'}

        # 检查并发限制
        max_concurrent = app.config.get('CRAWLER_CONCURRENT', 5)
        running_count = redis_client.scard(RUNNING_KEY)
        if running_count >= max_concurrent:
            return {'error': '并发任务已满，请稍后重试'}

        # URL 去重检查
        if TaskService._check_dedup(task_id, task.target_url):
            logger.info(f'Task {task_id} skipped: URL already crawled ({task.target_url})')
            return {'message': f'URL 已爬取，跳过: {task.target_url}', 'skipped': True}

        # 在 Redis 中记录运行中的任务
        redis_client.sadd(RUNNING_KEY, task_id)

        task.status = 'running'
        task.last_run_at = datetime.now()
        task.save()

        def _execute():
            with app.app_context():
                t = CrawlTask.find_by_id(task_id)
                spider = None
                success = False
                item_count = 0
                elapsed = 0
                try:
                    spider = SpiderService.get_spider(t.spider_name, t.config)
                    cancel_key = f'{CANCEL_KEY_PREFIX}{task_id}'
                    spider._cancel_checker = lambda: bool(redis_client.exists(cancel_key))
                    logger.info(f'[Execute] Task {task_id} started, cancel_key={cancel_key}')
                    start = time.time()
                    items = spider.run(t.target_url)
                    elapsed = int((time.time() - start) * 1000)

                    # 检测任务是否被取消
                    if spider._cancelled:
                        t.status = 'cancelled'
                        t.save()
                        redis_client.delete(cancel_key)
                        logger.info(f'[Execute] Task {task_id} cancelled after run() returned')
                        return

                    item_count = len(items)
                    for item in items:
                        CrawlResult(
                            task_id=t.id,
                            url=item.get('url', t.target_url),
                            title=item.get('title', ''),
                            content=item.get('content', ''),
                            raw_data=item,
                            status='success',
                            elapsed_ms=elapsed,
                        ).save()

                    t.status = 'idle'
                    t.save()
                    # 爬取成功后添加 URL 到去重集合
                    TaskService._add_dedup(task_id, t.target_url)
                    success = True
                except CancelledError:
                    # 爬虫在 fetch/sleep 中检测到取消标志抛出的异常
                    logger.info(f'[Execute] Task {task_id} cancelled via CancelledError')
                    t = CrawlTask.find_by_id(task_id)
                    if t:
                        t.status = 'cancelled'
                        t.save()
                    redis_client.delete(f'{CANCEL_KEY_PREFIX}{task_id}')
                except Exception as e:
                    logger.error(f'[Execute] Task {task_id} failed: {e}')
                    CrawlResult(
                        task_id=t.id,
                        url=t.target_url,
                        status='failed',
                        error_msg=str(e)[:500],
                    ).save()
                    t.status = 'error'
                    t.save()
                finally:
                    # 从 Redis 运行记录中移除任务 ID
                    redis_client.srem(RUNNING_KEY, task_id)
                    logger.info(f'[Execute] Task {task_id} removed from running set')
                    # 记录执行统计（取消的任务不记录）
                    if spider and not getattr(spider, '_cancelled', False):
                        StatsService.record_execution(task_id, success, item_count, elapsed)
                    if spider:
                        spider.close()

        if _executor is None:
            return {'error': '任务提交失败：线程池未初始化'}

        try:
            _executor.submit(_execute)
        except RuntimeError as e:
            # 线程池已关闭等异常
            redis_client.srem(RUNNING_KEY, task_id)
            task.status = 'idle'
            task.save()
            logger.error(f'Failed to submit task {task_id}: {e}')
            return {'error': '任务提交失败'}

        return {'message': '任务已启动', 'taskId': task_id}

    @staticmethod
    def get_results(task_id: str, page: int = 1, page_size: int = 20):
        items, total = CrawlResult.find_by_task(task_id, page, page_size)
        return {
            'pageData': [r.to_dict() for r in items],
            'total': total,
        }
