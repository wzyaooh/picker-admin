import logging

from app.extensions import redis_client
from app.models.task import CrawlTask

logger = logging.getLogger(__name__)

STATS_KEY_PREFIX = 'crawler:stats:'


class StatsService:
    """爬取统计服务，使用 Redis Hash 存储每个任务的统计数据"""

    @staticmethod
    def record_execution(task_id: str, success: bool, item_count: int, elapsed_ms: int) -> None:
        """记录一次执行结果。计数字段使用 HINCRBY 原子更新，last_elapsed_ms 使用 HSET 覆盖写入。"""
        key = f'{STATS_KEY_PREFIX}{task_id}'
        pipe = redis_client.pipeline()
        pipe.hincrby(key, 'total_runs', 1)
        if success:
            pipe.hincrby(key, 'success_count', 1)
        else:
            pipe.hincrby(key, 'fail_count', 1)
        pipe.hincrby(key, 'total_items', item_count)
        pipe.hset(key, 'last_elapsed_ms', elapsed_ms)
        pipe.execute()

    @staticmethod
    def get_task_stats(task_id: str) -> dict:
        """获取单个任务统计"""
        key = f'{STATS_KEY_PREFIX}{task_id}'
        data = redis_client.hgetall(key)
        return {
            'totalRuns': int(data.get('total_runs', 0)),
            'successCount': int(data.get('success_count', 0)),
            'failCount': int(data.get('fail_count', 0)),
            'totalItems': int(data.get('total_items', 0)),
            'lastElapsedMs': int(data.get('last_elapsed_ms', 0)),
        }

    @staticmethod
    def get_global_stats(exclude_spiders: list[str] | None = None, include_spiders: list[str] | None = None) -> dict:
        """获取全局统计（汇总所有任务）
        
        Args:
            exclude_spiders: 要排除的爬虫名称列表
            include_spiders: 只包含的爬虫名称列表（优先级高于 exclude）
        """
        # 构建任务查询条件
        query = {}
        if include_spiders:
            query['spider_name'] = {'$in': include_spiders}
        elif exclude_spiders:
            query['spider_name'] = {'$nin': exclude_spiders}
        
        total_tasks = CrawlTask._col().count_documents(query)
        running_tasks = redis_client.scard('crawler:running')

        total_runs = 0
        total_success = 0
        total_fails = 0

        # 如果有过滤条件，需要先获取符合条件的任务 ID
        if query:
            task_ids = [str(doc['_id']) for doc in CrawlTask._col().find(query, {'_id': 1})]
            # 只统计这些任务的数据
            for task_id in task_ids:
                key = f'{STATS_KEY_PREFIX}{task_id}'
                data = redis_client.hgetall(key)
                if data:
                    total_runs += int(data.get('total_runs', 0))
                    total_success += int(data.get('success_count', 0))
                    total_fails += int(data.get('fail_count', 0))
        else:
            # 无过滤条件，扫描所有统计数据
            cursor = 0
            while True:
                cursor, keys = redis_client.scan(cursor, match=f'{STATS_KEY_PREFIX}*', count=100)
                for key in keys:
                    data = redis_client.hgetall(key)
                    total_runs += int(data.get('total_runs', 0))
                    total_success += int(data.get('success_count', 0))
                    total_fails += int(data.get('fail_count', 0))
                if cursor == 0:
                    break

        return {
            'totalTasks': total_tasks,
            'runningTasks': running_tasks,
            'totalRuns': total_runs,
            'totalSuccess': total_success,
            'totalFails': total_fails,
        }

    @staticmethod
    def clear_task_stats(task_id: str) -> None:
        """清除任务统计"""
        redis_client.delete(f'{STATS_KEY_PREFIX}{task_id}')
