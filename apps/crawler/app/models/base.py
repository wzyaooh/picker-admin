"""MongoDB 模型基类

提供通用的 CRUD 方法，子类只需定义 COLLECTION 和字段即可。
"""

from datetime import datetime

from bson import ObjectId

from app.extensions import mongo_db


class BaseModel:
    """MongoDB 文档基类

    子类必须定义类属性 COLLECTION（集合名）。
    子类的 __init__ 必须接受 **kwargs 并调用 super().__init__(**kwargs)。
    子类需实现 _fields() 返回要持久化的字段字典。
    """

    COLLECTION: str = ''

    def __init__(self, **kwargs):
        self._id = kwargs.get('_id')
        self.created_at = kwargs.get('created_at', datetime.now())
        self.updated_at = kwargs.get('updated_at', datetime.now())

    @property
    def id(self) -> str | None:
        return str(self._id) if self._id else None

    @classmethod
    def _col(cls):
        return mongo_db[cls.COLLECTION]

    def _fields(self) -> dict:
        """返回需要持久化的字段字典（不含 _id），子类必须实现"""
        raise NotImplementedError

    def save(self):
        self.updated_at = datetime.now()
        doc = self._fields()
        if self._id:
            self._col().update_one({'_id': self._id}, {'$set': doc})
        else:
            result = self._col().insert_one(doc)
            self._id = result.inserted_id
        return self

    def delete(self):
        if self._id:
            self._col().delete_one({'_id': self._id})

    @classmethod
    def find_by_id(cls, doc_id: str):
        try:
            doc = cls._col().find_one({'_id': ObjectId(doc_id)})
        except Exception:
            return None
        return cls(**doc) if doc else None

    @classmethod
    def find_paginated(cls, query: dict | None = None,
                       page: int = 1, page_size: int = 20,
                       sort_field: str = '_id', sort_dir: int = -1):
        """通用分页查询"""
        query = query or {}
        total = cls._col().count_documents(query)
        cursor = (
            cls._col()
            .find(query)
            .sort(sort_field, sort_dir)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        items = [cls(**doc) for doc in cursor]
        return items, total

    @classmethod
    def delete_many(cls, query: dict):
        cls._col().delete_many(query)

    @classmethod
    def count(cls, query: dict | None = None) -> int:
        return cls._col().count_documents(query or {})
