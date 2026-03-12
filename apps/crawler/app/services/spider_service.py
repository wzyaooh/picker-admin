import logging
from app.spiders.base import BaseSpider
from app.spiders.generic import GenericSpider
from app.spiders.github_trending import GithubTrendingSpider
from app.spiders.github_repo import GithubRepoSpider

logger = logging.getLogger(__name__)

# 爬虫注册表 - 新增爬虫在此注册
SPIDER_REGISTRY: dict[str, type[BaseSpider]] = {
    'generic': GenericSpider,
    'github_trending': GithubTrendingSpider,
    'github_repo': GithubRepoSpider,
}


class SpiderService:
    """爬虫管理服务"""

    @staticmethod
    def get_spider(spider_name: str, config: dict | None = None) -> BaseSpider:
        spider_cls = SPIDER_REGISTRY.get(spider_name)
        if not spider_cls:
            raise ValueError(f'Unknown spider: {spider_name}. Available: {list(SPIDER_REGISTRY.keys())}')
        return spider_cls(config=config)

    @staticmethod
    def list_spiders() -> list[dict]:
        return [
            {'name': name, 'class': cls.__name__, 'doc': cls.__doc__ or ''}
            for name, cls in SPIDER_REGISTRY.items()
        ]
