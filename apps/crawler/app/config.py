import os
from dotenv import load_dotenv

load_dotenv()


class BaseConfig:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')

    # MongoDB
    MONGODB_SETTINGS = {
        'db': os.getenv('MONGO_DB', 'crawler_db'),
        'host': os.getenv('MONGO_HOST', '192.168.100.120'),
        'port': int(os.getenv('MONGO_PORT', 27017)),
        'username': os.getenv('MONGO_USER', 'root'),
        'password': os.getenv('MONGO_PASSWORD', '123456'),
        'authentication_source': os.getenv('MONGO_AUTH_SOURCE', 'admin'),
    }

    # MySQL (与后端共享)
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '123456')
    MYSQL_DB = os.getenv('MYSQL_DB', 'pick-admin')

    # Redis
    REDIS_URL = os.getenv('REDIS_URL')
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
    REDIS_DB = int(os.getenv('REDIS_DB', 1))
    REDIS_PASSWORD = os.getenv('REDIS_PASSWORD')

    # Crawler
    CRAWLER_CONCURRENT = int(os.getenv('CRAWLER_CONCURRENT', 5))
    CRAWLER_DELAY = float(os.getenv('CRAWLER_DELAY', 1.0))
    CRAWLER_TIMEOUT = int(os.getenv('CRAWLER_TIMEOUT', 30))
    CRAWLER_RETRY = int(os.getenv('CRAWLER_RETRY', 3))

    # Web Search
    WEB_SEARCH_TIMEOUT = int(os.getenv('WEB_SEARCH_TIMEOUT', 20))
    WEB_SEARCH_MAX_RETRIES = int(os.getenv('WEB_SEARCH_MAX_RETRIES', 2))

    # GitHub API Token（可选，提升速率限制到 5000 次/小时）
    GITHUB_TOKEN = os.getenv('GITHUB_TOKEN', '')

    # HTTP 代理（可选，用于访问 GitHub 等外部 API）
    HTTP_PROXY = os.getenv('HTTP_PROXY', '') or os.getenv('HTTPS_PROXY', '')

    # Anthropic (Claude)
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
    ANTHROPIC_BASE_URL = os.getenv('ANTHROPIC_BASE_URL', '')
    ANTHROPIC_MODEL = os.getenv('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')
    ANTHROPIC_MAX_TOKENS = int(os.getenv('ANTHROPIC_MAX_TOKENS', 128000))
    ANTHROPIC_ARTICLE_MAX_TOKENS = int(os.getenv('ANTHROPIC_ARTICLE_MAX_TOKENS', 64000))

    # TMDB API
    TMDB_API_KEY = os.getenv('TMDB_API_KEY', '')
    TMDB_BASE_URL = os.getenv('TMDB_BASE_URL', 'https://api.themoviedb.org/3')
    TMDB_IMAGE_BASE_URL = os.getenv('TMDB_IMAGE_BASE_URL', 'https://image.tmdb.org/t/p')

    # Scheduler
    SCHEDULER_ENABLED = True
    SCHEDULER_API_ENABLED = False

    # Backend API URL (用于记录统计数据)
    BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8085')


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class ProductionConfig(BaseConfig):
    DEBUG = False


class TestingConfig(BaseConfig):
    TESTING = True
    DEBUG = True
    SCHEDULER_ENABLED = False


config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
}
