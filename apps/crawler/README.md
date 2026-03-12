# Crawler Service

基于 Flask 的爬虫服务，集成在 monorepo 中，提供 RESTful API。

## 快速开始

```bash
cd apps/crawler

# 创建虚拟环境
python -m venv venv
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
copy .env.example .env

# 启动服务
python run.py
```

服务运行在 `http://localhost:5321`

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /crawler/tasks | 任务列表 |
| POST | /crawler/tasks | 创建任务 |
| GET | /crawler/tasks/:id | 任务详情 |
| PATCH | /crawler/tasks/:id | 更新任务 |
| DELETE | /crawler/tasks/:id | 删除任务 |
| POST | /crawler/tasks/:id/run | 执行任务 |
| GET | /crawler/tasks/:id/results | 爬取结果 |
| GET | /crawler/spiders | 可用爬虫列表 |
| POST | /crawler/spiders/test | 测试爬虫 |

## 自定义爬虫

继承 `BaseSpider` 并注册到 `SPIDER_REGISTRY`：

```python
# app/spiders/my_spider.py
from app.spiders.base import BaseSpider

class MySpider(BaseSpider):
    name = 'my_spider'

    def parse(self, url):
        resp = self.fetch(url)
        # 解析逻辑
        return [{'title': '...', 'content': '...'}]
```

```python
# app/services/spider_service.py
SPIDER_REGISTRY = {
    'generic': GenericSpider,
    'my_spider': MySpider,  # 注册
}
```
