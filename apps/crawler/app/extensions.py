from flask_apscheduler import APScheduler
from pymongo import MongoClient
import pymysql
import redis
import os

scheduler = APScheduler()

# Redis client (initialized in create_app)
redis_client: redis.Redis | None = None

# MongoDB client (initialized in create_app)
mongo_client: MongoClient | None = None
mongo_db = None

# MySQL connection pool (initialized in create_app)
mysql_pool = None


def init_redis(app=None):
    """初始化 Redis 客户端，优先使用 REDIS_URL"""
    global redis_client
    redis_url = app.config.get('REDIS_URL') if app else os.getenv('REDIS_URL')
    if redis_url:
        redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
    else:
        redis_client = redis.Redis(
            host=app.config['REDIS_HOST'] if app else os.getenv('REDIS_HOST', 'localhost'),
            port=app.config['REDIS_PORT'] if app else int(os.getenv('REDIS_PORT', 6379)),
            db=app.config['REDIS_DB'] if app else int(os.getenv('REDIS_DB', 1)),
            password=app.config['REDIS_PASSWORD'] if app else os.getenv('REDIS_PASSWORD'),
            decode_responses=True,
        )


def init_mongo(app):
    """初始化 MongoDB 连接"""
    global mongo_client, mongo_db
    settings = app.config['MONGODB_SETTINGS']
    mongo_client = MongoClient(
        host=settings['host'],
        port=settings['port'],
        username=settings.get('username'),
        password=settings.get('password'),
        authSource=settings.get('authentication_source', 'admin'),
    )
    mongo_db = mongo_client[settings['db']]


def init_mysql(app):
    """初始化 MySQL 连接"""
    global mysql_pool
    mysql_pool = {
        'host': app.config['MYSQL_HOST'],
        'port': app.config['MYSQL_PORT'],
        'user': app.config['MYSQL_USER'],
        'password': app.config['MYSQL_PASSWORD'],
        'database': app.config['MYSQL_DB'],
        'charset': 'utf8mb4',
        'cursorclass': pymysql.cursors.DictCursor,
    }


def get_mysql_connection():
    """获取 MySQL 连接"""
    if mysql_pool is None:
        raise RuntimeError('MySQL not initialized. Call init_mysql first.')
    return pymysql.connect(**mysql_pool)
