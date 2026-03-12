from datetime import datetime

from app.models.base import BaseModel


class CrawlTask(BaseModel):
    """爬虫任务"""

    COLLECTION = 'crawl_task'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = kwargs.get('name', '')
        self.spider_name = kwargs.get('spider_name', '')
        self.target_url = kwargs.get('target_url', '')
        self.cron_expr = kwargs.get('cron_expr')
        self.config = kwargs.get('config')
        self.status = kwargs.get('status', 'idle')
        self.last_run_at = kwargs.get('last_run_at')
        self.enabled = kwargs.get('enabled', True)

    def _fields(self) -> dict:
        return {
            'name': self.name,
            'spider_name': self.spider_name,
            'target_url': self.target_url,
            'cron_expr': self.cron_expr,
            'config': self.config,
            'status': self.status,
            'last_run_at': self.last_run_at,
            'enabled': self.enabled,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'spiderName': self.spider_name,
            'targetUrl': self.target_url,
            'cronExpr': self.cron_expr,
            'config': self.config,
            'status': self.status,
            'lastRunAt': self.last_run_at.isoformat() if self.last_run_at else None,
            'enabled': self.enabled,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
