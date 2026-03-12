"""全局常量

Redis key 前缀、状态枚举等集中管理。
"""

# ==================== Redis Key 前缀 ====================

REDIS_PREFIX_STATS = 'crawler:stats:'
REDIS_PREFIX_RUNNING = 'crawler:running'
REDIS_PREFIX_DEDUP = 'crawler:dedup:'
REDIS_PREFIX_CANCEL = 'crawler:cancel:'
REDIS_PREFIX_ENRICH_RUNNING = 'crawler:enrich_running:'
REDIS_PREFIX_ENRICH_SINGLE = 'crawler:enrich_single:'
REDIS_PREFIX_POLISH = 'crawler:polish:'
REDIS_PREFIX_HOT_DATA = 'crawler:hotdata:aggregated'

# ==================== 缓存 TTL（秒） ====================

CACHE_TTL_HOT_DATA = 1800       # 热点数据 30 分钟
CACHE_TTL_TMDB_GENRES = 86400   # TMDB 类型列表 24 小时
CACHE_TTL_SPIDER_WEIBO = 1800   # 微博热搜 30 分钟
CACHE_TTL_SPIDER_DOUYIN = 1800  # 抖音热榜 30 分钟

# ==================== 选题状态 ====================

TOPIC_STATUSES = {'idea', 'material', 'scripting', 'editing', 'review', 'published'}
TOPIC_PRIORITIES = {'low', 'medium', 'high'}

# ==================== 任务状态 ====================

TASK_STATUS_IDLE = 'idle'
TASK_STATUS_RUNNING = 'running'
TASK_STATUS_SUCCESS = 'success'
TASK_STATUS_FAILED = 'failed'
TASK_STATUS_CANCELLED = 'cancelled'

# ==================== 热点数据源 ====================

HOT_SOURCE_TMDB = 'tmdb'
HOT_SOURCE_DOUBAN = 'douban'
HOT_SOURCE_WEIBO = 'weibo'
HOT_SOURCE_DOUYIN = 'douyin'
HOT_ALL_SOURCES = [HOT_SOURCE_TMDB, HOT_SOURCE_DOUBAN, HOT_SOURCE_WEIBO, HOT_SOURCE_DOUYIN]
