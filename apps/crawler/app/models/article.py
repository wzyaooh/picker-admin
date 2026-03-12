from datetime import datetime

from bson import ObjectId

from app.models.base import BaseModel


class GeneratedArticle(BaseModel):
    """LLM 生成的深度技术文章，关联爬取结果，支持版本管理"""

    COLLECTION = 'generated_article'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.result_id = kwargs.get('result_id', '')
        self.task_id = kwargs.get('task_id', '')
        self.enriched_id = kwargs.get('enriched_id', '')
        self.title = kwargs.get('title', '')
        self.project_name = kwargs.get('project_name', '')
        self.project_url = kwargs.get('project_url', '')
        self.category = kwargs.get('category', '')
        self.tags = kwargs.get('tags', [])
        # 文章类型：analysis（深度解析）/ tutorial（实践教程）
        self.article_type = kwargs.get('article_type', 'analysis')
        self.content = kwargs.get('content', '')
        self.word_count = kwargs.get('word_count', 0)
        self.model = kwargs.get('model', '')
        self.tokens_used = kwargs.get('tokens_used', 0)
        # 版本管理
        self.version = kwargs.get('version', 1)
        self.parent_id = kwargs.get('parent_id', '')
        self.group_id = kwargs.get('group_id', '')
        self.is_latest = kwargs.get('is_latest', True)
        # 润色元信息
        self.polish_summary = kwargs.get('polish_summary', '')
        self.data_diff = kwargs.get('data_diff', {})
        self.status = kwargs.get('status', 'pending')
        self.error_msg = kwargs.get('error_msg')

    def _fields(self) -> dict:
        return {
            'result_id': self.result_id,
            'task_id': self.task_id,
            'enriched_id': self.enriched_id,
            'title': self.title,
            'project_name': self.project_name,
            'project_url': self.project_url,
            'category': self.category,
            'tags': self.tags,
            'article_type': self.article_type,
            'content': self.content,
            'word_count': self.word_count,
            'model': self.model,
            'tokens_used': self.tokens_used,
            'version': self.version,
            'parent_id': self.parent_id,
            'group_id': self.group_id,
            'is_latest': self.is_latest,
            'polish_summary': self.polish_summary,
            'data_diff': self.data_diff,
            'status': self.status,
            'error_msg': self.error_msg,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

    def save(self):
        """重写 save：新建 v1 文章时 group_id 指向自身"""
        super().save()
        if not self.group_id and self._id:
            self.group_id = self.id
            self._col().update_one(
                {'_id': self._id},
                {'$set': {'group_id': self.group_id}},
            )
        return self

    @classmethod
    def find_by_result_id(cls, result_id: str, article_type: str = None):
        query = {'result_id': result_id, '$or': [{'is_latest': True}, {'is_latest': {'$exists': False}}]}
        if article_type:
            query['article_type'] = article_type
        doc = cls._col().find_one(query)
        if not doc:
            fallback_query = {'result_id': result_id}
            if article_type:
                fallback_query['article_type'] = article_type
            doc = cls._col().find_one(fallback_query)
        return cls(**doc) if doc else None

    @classmethod
    def find_by_enriched_id(cls, enriched_id: str):
        doc = cls._col().find_one({
            'enriched_id': enriched_id,
            '$or': [{'is_latest': True}, {'is_latest': {'$exists': False}}],
        })
        if not doc:
            doc = cls._col().find_one({'enriched_id': enriched_id})
        return cls(**doc) if doc else None

    @classmethod
    def find_by_task(cls, task_id: str, page: int = 1, page_size: int = 20):
        query = {
            'task_id': task_id,
            '$or': [{'is_latest': True}, {'is_latest': {'$exists': False}}],
        }
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
    def list_all(cls, page: int = 1, page_size: int = 20, keyword: str = ''):
        latest_filter = {'$or': [{'is_latest': True}, {'is_latest': {'$exists': False}}]}
        query = latest_filter
        if keyword:
            keyword_filter = {'$or': [
                {'title': {'$regex': keyword, '$options': 'i'}},
                {'project_name': {'$regex': keyword, '$options': 'i'}},
                {'category': {'$regex': keyword, '$options': 'i'}},
            ]}
            query = {'$and': [latest_filter, keyword_filter]}
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
    def find_versions(cls, group_id: str) -> list:
        """获取同一篇文章的所有版本，按版本号降序"""
        cursor = (
            cls._col()
            .find({'group_id': group_id})
            .sort('version', -1)
        )
        results = [cls(**doc) for doc in cursor]
        if not results and group_id:
            try:
                doc = cls._col().find_one({'_id': ObjectId(group_id)})
                if doc:
                    results = [cls(**doc)]
            except Exception:
                pass
        return results

    @classmethod
    def find_latest_in_group(cls, group_id: str):
        """获取版本组中的最新版本"""
        doc = cls._col().find_one(
            {'group_id': group_id, 'is_latest': True},
        )
        return cls(**doc) if doc else None

    @classmethod
    def set_latest(cls, article_id: str, group_id: str):
        """将指定版本设为最新，其余版本取消最新标记"""
        cls._col().update_many(
            {'group_id': group_id},
            {'$set': {'is_latest': False}},
        )
        cls._col().update_one(
            {'_id': ObjectId(article_id)},
            {'$set': {'is_latest': True}},
        )

    @classmethod
    def count_versions(cls, group_id: str) -> int:
        """统计版本组中的版本数量"""
        return cls._col().count_documents({'group_id': group_id})

    @classmethod
    def delete_by_task(cls, task_id: str):
        cls.delete_many({'task_id': task_id})

    def to_dict(self):
        return {
            'id': self.id,
            'resultId': self.result_id,
            'taskId': self.task_id,
            'enrichedId': self.enriched_id,
            'title': self.title,
            'projectName': self.project_name,
            'projectUrl': self.project_url,
            'category': self.category,
            'tags': self.tags,
            'articleType': self.article_type,
            'content': self.content,
            'wordCount': self.word_count,
            'model': self.model,
            'tokensUsed': self.tokens_used,
            'version': self.version,
            'parentId': self.parent_id,
            'groupId': self.group_id,
            'isLatest': self.is_latest,
            'polishSummary': self.polish_summary,
            'dataDiff': self.data_diff,
            'status': self.status,
            'errorMsg': self.error_msg,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_list_dict(self):
        """列表页用的精简字典，不含完整 content"""
        return {
            'id': self.id,
            'resultId': self.result_id,
            'taskId': self.task_id,
            'enrichedId': self.enriched_id,
            'title': self.title,
            'projectName': self.project_name,
            'projectUrl': self.project_url,
            'category': self.category,
            'tags': self.tags,
            'articleType': self.article_type,
            'wordCount': self.word_count,
            'model': self.model,
            'tokensUsed': self.tokens_used,
            'version': self.version,
            'parentId': self.parent_id,
            'groupId': self.group_id,
            'isLatest': self.is_latest,
            'polishSummary': self.polish_summary,
            'status': self.status,
            'errorMsg': self.error_msg,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_version_dict(self):
        """版本列表用的精简字典"""
        return {
            'id': self.id,
            'version': self.version,
            'isLatest': self.is_latest,
            'polishSummary': self.polish_summary,
            'wordCount': self.word_count,
            'model': self.model,
            'tokensUsed': self.tokens_used,
            'status': self.status,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
