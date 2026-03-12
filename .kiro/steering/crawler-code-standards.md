---
inclusion: fileMatch
fileMatchPattern: "apps/crawler/**"
---

# 爬虫项目代码规范（Flask + Python）

本文档定义 `apps/crawler` 爬虫服务的开发规范，涵盖项目架构、爬虫开发、API 接口、数据模型等。

## 1. 项目架构

```
apps/crawler/
├── app/
│   ├── __init__.py          # Flask 工厂函数 create_app
│   ├── config.py            # 配置类（BaseConfig / Dev / Prod）
│   ├── extensions.py        # Flask 扩展实例（scheduler, redis, mongo）
│   ├── api/                 # API 路由层（Blueprint）
│   │   ├── __init__.py      # api_bp Blueprint 定义
│   │   ├── task.py          # 任务 CRUD + 执行接口
│   │   └── spider.py        # 爬虫列表 + 测试接口
│   ├── models/              # 数据模型（raw pymongo）
│   │   ├── task.py          # CrawlTask
│   │   └── result.py        # CrawlResult
│   ├── services/            # 业务逻辑层
│   │   ├── task_service.py  # 任务管理
│   │   └── spider_service.py # 爬虫注册与实例化
│   └── spiders/             # 爬虫实现
│       ├── base.py          # BaseSpider 抽象基类
│       ├── generic.py       # GenericSpider 通用爬虫
│       └── github_trending.py # GithubTrendingSpider GitHub 趋势爬虫
├── run.py                   # 入口
├── requirements.txt
├── Dockerfile
└── .env.example
```

### 1.1 分层职责

| 层 | 目录 | 职责 | 禁止 |
|---|---|---|---|
| API 路由层 | `api/` | 接收请求、参数校验、调用 Service、返回响应 | 不写业务逻辑、不直接操作 db |
| Service 层 | `services/` | 业务逻辑、数据库操作 | 不访问 request 对象 |
| Model 层 | `models/` | 定义 MongoDB 文档结构、`to_dict` 序列化 | 不包含业务逻辑 |
| Spider 层 | `spiders/` | 爬虫实现（请求、解析、数据提取） | 不操作数据库 |

### 1.2 基础设施

- 数据库：MongoDB（通过 raw pymongo），独立数据库 `crawler_db`
- 缓存：Redis，与后端共享实例，使用独立 db 编号（默认 db=1）
- 定时任务：APScheduler
- 端口：`5321`
- API 前缀：`/crawler`（不以 `/api` 开头，避免与 NestJS 后端冲突）


## 2. API 接口规范

### 2.1 路由前缀

所有接口挂载在 Blueprint `api_bp` 下，注册前缀为 `/crawler`：

```python
# app/__init__.py
app.register_blueprint(api_bp, url_prefix='/crawler')
```

最终路径示例：`GET /crawler/tasks`、`POST /crawler/spiders/test`

### 2.2 统一响应格式

使用 `ok()` 和 `fail()` 辅助函数，保持与 NestJS 后端一致的响应结构：

```python
# 成功
{'code': 0, 'data': ..., 'message': 'success'}

# 失败
{'code': 1, 'message': '错误描述'}
```

```python
# ✅ 推荐 - 使用辅助函数
from app.api.task import ok, fail

@api_bp.route('/xxx', methods=['GET'])
def get_xxx():
    data = XxxService.get_all()
    return ok(data)

# ❌ 避免 - 手动构造 jsonify
return jsonify({'code': 0, 'data': data, 'message': 'success'})
```

### 2.3 RESTful 路由设计

MongoDB 使用 ObjectId 字符串作为主键，路由参数不加类型约束：

```python
# ✅ 推荐（MongoDB ObjectId 是字符串）
@api_bp.route('/tasks', methods=['GET'])              # 列表
@api_bp.route('/tasks/<task_id>', methods=['GET'])     # 详情
@api_bp.route('/tasks', methods=['POST'])              # 创建
@api_bp.route('/tasks/<task_id>', methods=['PATCH'])   # 更新
@api_bp.route('/tasks/<task_id>', methods=['DELETE'])   # 删除
@api_bp.route('/tasks/<task_id>/run', methods=['POST']) # 动作

# ❌ 避免 - 不要用 int 约束（ObjectId 不是整数）
@api_bp.route('/tasks/<int:task_id>', methods=['GET'])

# ❌ 避免 - 动词路由
@api_bp.route('/getTaskList', methods=['GET'])
```

### 2.4 分页参数

与前端保持一致，使用 `pageNo` 和 `pageSize`：

```python
page = request.args.get('pageNo', 1, type=int)
page_size = request.args.get('pageSize', 10, type=int)
```

分页响应格式：

```python
{
    'pageData': [...],
    'total': 100
}
```

### 2.5 参数校验

在 API 层做基础校验，Service 层做业务校验：

```python
# ✅ 推荐
@api_bp.route('/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    if not data:
        return fail('请求体不能为空'), 400
    required = ('name', 'spiderName', 'targetUrl')
    for field in required:
        if field not in data:
            return fail(f'缺少必填字段: {field}'), 400
    task = TaskService.create_task(data)
    return ok(task.to_dict()), 201
```

### 2.6 HTTP 状态码

| 场景 | 状态码 |
|---|---|
| 成功 | 200 |
| 创建成功 | 201 |
| 参数错误 | 400 |
| 资源不存在 | 404 |
| 服务器错误 | 500 |

### 2.7 新增 API 模块

在 `app/api/` 下新建文件，然后在 `app/api/__init__.py` 中导入：

```python
# app/api/__init__.py
from flask import Blueprint

api_bp = Blueprint('api', __name__)

from app.api import task, spider, new_module  # 新增导入
```


## 3. 爬虫开发规范

### 3.1 继承 BaseSpider

所有爬虫必须继承 `BaseSpider` 并实现 `parse` 方法：

```python
from typing import Any
from app.spiders.base import BaseSpider

class MySpider(BaseSpider):
    """爬虫描述（会展示在爬虫列表中）"""

    name = 'my_spider'  # 唯一标识，用于注册和任务关联

    def parse(self, url: str) -> list[dict[str, Any]]:
        resp = self.fetch(url)  # 使用内置的带重试请求
        # 解析逻辑...
        return [{'title': '...', 'content': '...', 'url': url}]
```

### 3.2 BaseSpider 提供的能力

| 方法/属性 | 说明 |
|---|---|
| `self.fetch(url)` | 带重试、超时、随机 UA 的 GET 请求 |
| `self.session` | requests.Session 实例，可自定义 headers/cookies |
| `self.config` | 任务传入的配置字典 |
| `self.timeout` | 请求超时（秒） |
| `self.retry` | 重试次数 |
| `self.delay` | 重试间隔（秒） |
| `self.close()` | 关闭 session，释放资源 |

### 3.3 注册爬虫

在 `app/services/spider_service.py` 的 `SPIDER_REGISTRY` 中注册：

```python
from app.spiders.my_spider import MySpider

SPIDER_REGISTRY: dict[str, type[BaseSpider]] = {
    'generic': GenericSpider,
    'github_trending': GithubTrendingSpider,
    'my_spider': MySpider,  # 新增
}
```

### 3.4 爬虫开发原则

```python
# ✅ 推荐
- parse() 返回 list[dict]，每个 dict 代表一条结果
- 使用 self.fetch() 而非直接 requests.get()
- 使用 BeautifulSoup + lxml 解析 HTML
- 结果中包含 url 字段标识来源
- 在 docstring 中描述爬虫用途
- name 属性使用 snake_case

# ❌ 避免
- 在爬虫中操作数据库
- 在爬虫中 import flask 相关模块
- 硬编码 User-Agent（BaseSpider 已处理）
- 不处理异常直接抛出（fetch 已有重试机制）
- parse() 返回非列表类型
```

### 3.5 爬虫配置

通过任务的 `config` JSON 字段传递爬虫特定配置：

```python
class MySpider(BaseSpider):
    name = 'my_spider'

    def parse(self, url: str) -> list[dict[str, Any]]:
        # 从 config 读取自定义参数
        max_pages = self.config.get('maxPages', 5)
        selector = self.config.get('selector', 'article')
        # ...
```

创建任务时传入：

```json
{
    "name": "示例任务",
    "spiderName": "my_spider",
    "targetUrl": "https://example.com",
    "config": {
        "maxPages": 10,
        "selector": ".post-content"
    }
}
```


## 4. 数据模型规范（MongoDB / raw pymongo）

项目使用 raw pymongo 操作 MongoDB，不使用 MongoEngine。每个模型是一个普通 Python 类，通过 `_col()` 静态方法获取 pymongo Collection 实例。

### 4.1 模型定义

```python
from datetime import datetime
from bson import ObjectId
from app.extensions import mongo_db

COLLECTION = 'my_collection'

class MyModel:
    """文档描述"""

    def __init__(self, **kwargs):
        self._id = kwargs.get('_id')
        self.name = kwargs.get('name', '')
        self.count = kwargs.get('count', 0)
        self.tags = kwargs.get('tags', [])
        self.extra = kwargs.get('extra')
        self.enabled = kwargs.get('enabled', True)
        self.created_at = kwargs.get('created_at', datetime.now())
        self.updated_at = kwargs.get('updated_at', datetime.now())

    @property
    def id(self):
        return str(self._id) if self._id else None

    @staticmethod
    def _col():
        return mongo_db[COLLECTION]

    def save(self):
        self.updated_at = datetime.now()
        doc = {
            'name': self.name,
            'count': self.count,
            'tags': self.tags,
            'extra': self.extra,
            'enabled': self.enabled,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }
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

    def to_dict(self):
        """序列化为 camelCase 字典（与前端对齐）"""
        return {
            'id': self.id,  # ObjectId 已通过 property 转为字符串
            'name': self.name,
            'count': self.count,
            'tags': self.tags,
            'extra': self.extra,
            'enabled': self.enabled,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
```

### 4.2 字段规范

- 字段名使用 `snake_case`（Python 惯例）
- `to_dict()` 输出使用 `camelCase`（与前端对齐）
- `id` 通过 `@property` 将 `_id`（ObjectId）转为字符串
- `_col()` 静态方法返回 `mongo_db[COLLECTION]`，集合名通过模块级常量 `COLLECTION` 定义
- 关联关系使用字符串存储 ObjectId（不使用 DBRef）
- `save()` 方法根据 `_id` 是否存在自动判断 insert 或 update
- `find_by_id()` 使用 try/except 包裹，防止无效 ObjectId 字符串报错

### 4.3 查询规范

```python
# 查询单个
task = CrawlTask.find_by_id(task_id)

# 查询列表 + 分页
query = {}
if keyword:
    query['name'] = {'$regex': keyword, '$options': 'i'}
total = CrawlTask._col().count_documents(query)
cursor = (
    CrawlTask._col()
    .find(query)
    .sort('_id', -1)
    .skip((page - 1) * page_size)
    .limit(page_size)
)
items = [CrawlTask(**doc) for doc in cursor]

# 删除关联数据
CrawlResult._col().delete_many({'task_id': task_id})

# 更新字段
task.name = 'new name'
task.save()
```


## 5. Service 层规范

### 5.1 基础结构

```python
import logging
from app.models.xxx import XxxModel

logger = logging.getLogger(__name__)

class XxxService:
    """服务描述"""

    @staticmethod
    def create(data: dict) -> XxxModel:
        entity = XxxModel(**data)
        entity.save()
        return entity

    @staticmethod
    def get_by_id(doc_id: str) -> XxxModel | None:
        return XxxModel.find_by_id(doc_id)

    @staticmethod
    def list_paginated(page: int = 1, page_size: int = 10, keyword: str = ''):
        query = {}
        if keyword:
            query['name'] = {'$regex': keyword, '$options': 'i'}
        total = XxxModel._col().count_documents(query)
        cursor = (
            XxxModel._col()
            .find(query)
            .sort('_id', -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        items = [XxxModel(**doc) for doc in cursor]
        return {
            'pageData': [item.to_dict() for item in items],
            'total': total,
        }
```

### 5.2 Service 规范

```python
# ✅ 推荐
- 使用 @staticmethod（无实例状态时）
- 使用 logging 模块记录日志
- 方法返回模型实例或字典，不返回 Response
- ID 参数类型为 str（MongoDB ObjectId）
- 查询单个文档通过模型的 `find_by_id()`（内部已有 try/except 防止无效 ObjectId 报错）
- 删除操作先清理关联数据
- 异步任务使用 Thread + app_context

# ❌ 避免
- 在 Service 中 import flask.request
- 在 Service 中直接返回 jsonify
- 使用 print 代替 logger
- ID 参数类型用 int（MongoDB 用 ObjectId 字符串）
```


## 6. 命名规范

### 6.1 文件命名

```
✅ task_service.py, crawl_task.py, generic.py
❌ TaskService.py, crawlTask.py, Generic.py
```

### 6.2 类命名

```python
# ✅ PascalCase
class CrawlTask: ...
class TaskService: ...
class GenericSpider(BaseSpider): ...

# ❌
class crawl_task: ...
class taskService: ...
```

### 6.3 函数/变量命名

```python
# ✅ snake_case
def create_task(data): ...
task_id = '507f1f77bcf86cd799439011'
page_size = 10

# ❌
def createTask(data): ...
taskId = 1
```

### 6.4 常量命名

```python
# ✅ UPPER_SNAKE_CASE
SPIDER_REGISTRY = {}
DEFAULT_PAGE_SIZE = 10
MAX_RETRY_COUNT = 3
```

### 6.5 API 字段命名

API 输入输出统一使用 `camelCase`（与前端对齐）：

```python
# 接收前端参数
data['spiderName']   # ✅ camelCase
data['spider_name']  # ❌ snake_case

# to_dict 输出
{'spiderName': self.spider_name}  # ✅
{'spider_name': self.spider_name} # ❌

# id 字段通过 @property 已转为字符串
{'id': self.id}          # ✅ property 返回 str(self._id)
{'id': self._id}         # ❌ ObjectId 不可 JSON 序列化
```


## 7. 错误处理

### 7.1 API 层

```python
# ✅ 推荐 - 返回 fail + HTTP 状态码
if not task:
    return fail('任务不存在'), 404

if not data:
    return fail('请求体不能为空'), 400
```

### 7.2 Service 层

```python
# ✅ 推荐 - 使用模型的 find_by_id（内部已有 try/except 防止无效 ObjectId）
@staticmethod
def get_task(task_id: str) -> CrawlTask | None:
    return CrawlTask.find_by_id(task_id)

# ✅ 推荐 - 返回 None 或 False 表示失败
@staticmethod
def delete_task(task_id: str) -> bool:
    task = CrawlTask.find_by_id(task_id)
    if not task:
        return False
    task.delete()
    return True
```

### 7.3 Spider 层

```python
# ✅ 推荐 - 让异常自然抛出，由 TaskService 捕获并记录到 CrawlResult
def parse(self, url):
    resp = self.fetch(url)  # 失败会抛 RequestException
    soup = BeautifulSoup(resp.text, 'lxml')
    # ...
```


## 8. 日志规范

```python
import logging

logger = logging.getLogger(__name__)

# ✅ 推荐
logger.info(f'Task {task_id} started')
logger.warning(f'Retry {attempt}/{max_retry} for {url}')
logger.error(f'Task {task_id} failed: {e}')

# ❌ 避免
print('task started')
```


## 9. 现有接口一览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /crawler/tasks | 任务列表（分页） |
| GET | /crawler/tasks/:id | 任务详情 |
| POST | /crawler/tasks | 创建任务 |
| PATCH | /crawler/tasks/:id | 更新任务 |
| DELETE | /crawler/tasks/:id | 删除任务 |
| POST | /crawler/tasks/:id/run | 执行任务 |
| GET | /crawler/tasks/:id/results | 爬取结果（分页） |
| GET | /crawler/spiders | 可用爬虫列表 |
| POST | /crawler/spiders/test | 测试爬虫（同步执行） |

注：`:id` 为 MongoDB ObjectId 字符串（如 `507f1f77bcf86cd799439011`）


## 10. 依赖管理

- 所有 Python 依赖写入 `apps/crawler/requirements.txt`
- 数据库驱动：`pymongo`（直接使用 raw pymongo，不使用 MongoEngine）
- 使用 venv 虚拟环境隔离
- 已从 pnpm-workspace.yaml 排除（`!apps/crawler`）
- 根 package.json 提供快捷命令 `pnpm dev:crawler`
