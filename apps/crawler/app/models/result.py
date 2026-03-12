from datetime import datetime

from app.models.base import BaseModel


class CrawlResult(BaseModel):
    """爬取结果"""

    COLLECTION = 'crawl_result'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.task_id = kwargs.get('task_id', '')
        self.url = kwargs.get('url', '')
        self.title = kwargs.get('title')
        self.content = kwargs.get('content')
        self.raw_data = kwargs.get('raw_data')
        self.status = kwargs.get('status', 'success')
        self.error_msg = kwargs.get('error_msg')
        self.elapsed_ms = kwargs.get('elapsed_ms')

    def _fields(self) -> dict:
        return {
            'task_id': self.task_id,
            'url': self.url,
            'title': self.title,
            'content': self.content,
            'raw_data': self.raw_data,
            'status': self.status,
            'error_msg': self.error_msg,
            'elapsed_ms': self.elapsed_ms,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

    @classmethod
    def find_by_task(cls, task_id: str, page: int = 1, page_size: int = 20):
        query = {'task_id': task_id}
        total = cls._col().count_documents(query)
        cursor = (
            cls._col()
            .find(query)
            .sort('_id', -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        items = [cls(**doc) for doc in cursor]
        return items, total

    @classmethod
    def find_all(cls, page: int = 1, page_size: int = 20,
                 task_id: str = '', keyword: str = ''):
        query = {}
        if task_id:
            query['task_id'] = task_id
        if keyword:
            query['$or'] = [
                {'title': {'$regex': keyword, '$options': 'i'}},
                {'url': {'$regex': keyword, '$options': 'i'}},
            ]
        total = cls._col().count_documents(query)
        cursor = (
            cls._col()
            .find(query)
            .sort('_id', -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        items = [cls(**doc) for doc in cursor]
        return items, total

    @classmethod
    def count_by_task(cls, task_id: str) -> int:
        return cls._col().count_documents({'task_id': task_id})

    @classmethod
    def delete_by_task(cls, task_id: str):
        cls._col().delete_many({'task_id': task_id})

    def to_dict(self):
        return {
            'id': self.id,
            'taskId': self.task_id,
            'url': self.url,
            'title': self.title,
            'content': self.content[:200] if self.content else None,
            'rawData': self.raw_data,
            'status': self.status,
            'errorMsg': self.error_msg,
            'elapsedMs': self.elapsed_ms,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
