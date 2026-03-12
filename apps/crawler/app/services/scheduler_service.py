import logging

from app.extensions import scheduler
from app.models.task import CrawlTask

logger = logging.getLogger(__name__)

JOB_ID_PREFIX = 'crawl_task_'


class SchedulerService:
    """Cron 定时调度服务"""

    @staticmethod
    def parse_cron(cron_expr: str) -> dict:
        """解析 5 段 cron 表达式为 APScheduler CronTrigger 参数字典。
        格式：分 时 日 月 周
        无效时抛出 ValueError。
        """
        parts = cron_expr.strip().split()
        if len(parts) != 5:
            raise ValueError(f'无效的 cron 表达式: {cron_expr}，需要 5 段（分 时 日 月 周）')
        return {
            'minute': parts[0],
            'hour': parts[1],
            'day': parts[2],
            'month': parts[3],
            'day_of_week': parts[4],
        }

    @staticmethod
    def register_task(task) -> bool:
        """注册 cron 定时任务。返回是否成功注册。"""
        if not task.cron_expr:
            return False
        try:
            cron_params = SchedulerService.parse_cron(task.cron_expr)
        except ValueError as e:
            logger.warning(f'Failed to register task {task.id}: {e}')
            return False

        job_id = f'{JOB_ID_PREFIX}{task.id}'

        # 如果已存在则先移除
        existing = scheduler.get_job(job_id)
        if existing:
            scheduler.remove_job(job_id)

        # 注册新 job，使用字符串引用避免循环导入
        scheduler.add_job(
            id=job_id,
            func='app.services.scheduler_service:_execute_task',
            trigger='cron',
            args=[str(task.id)],
            **cron_params,
        )
        logger.info(f'Registered cron job {job_id} with cron: {task.cron_expr}')
        return True

    @staticmethod
    def unregister_task(task_id: str) -> bool:
        """移除定时任务。返回是否成功移除。"""
        job_id = f'{JOB_ID_PREFIX}{task_id}'
        existing = scheduler.get_job(job_id)
        if existing:
            scheduler.remove_job(job_id)
            logger.info(f'Unregistered cron job {job_id}')
            return True
        return False

    @staticmethod
    def sync_task(task) -> None:
        """同步任务状态：enabled+有效cron则注册，否则移除。"""
        if task.enabled and task.cron_expr:
            SchedulerService.register_task(task)
        else:
            SchedulerService.unregister_task(str(task.id))

    @staticmethod
    def load_all_tasks() -> int:
        """应用启动时加载所有需要调度的任务，返回注册数量。"""
        count = 0
        cursor = CrawlTask._col().find({'enabled': True})
        for doc in cursor:
            task = CrawlTask(**doc)
            if task.cron_expr:
                if SchedulerService.register_task(task):
                    count += 1
        logger.info(f'Loaded {count} scheduled tasks')
        return count


def _execute_task(task_id: str):
    """APScheduler 回调函数，在 app context 中执行任务"""
    from flask import current_app
    from app.services.task_service import TaskService

    app = current_app._get_current_object()
    result = TaskService.run_task(task_id, app)
    if 'error' in result:
        logger.warning(f'Scheduled task {task_id} failed to start: {result["error"]}')
    else:
        logger.info(f'Scheduled task {task_id} started: {result.get("message", "")}')
