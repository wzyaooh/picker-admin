import json
import logging
import time
import requests
import os
import pymysql
from typing import Dict, Any
from app.extensions import redis_client

logger = logging.getLogger(__name__)

class AuthService:
    """API Key 认证服务"""

    @staticmethod
    def _get_mysql_connection():
        """获取 MySQL 连接"""
        from app.config import BaseConfig
        return pymysql.connect(
            host=BaseConfig.MYSQL_HOST,
            port=BaseConfig.MYSQL_PORT,
            user=BaseConfig.MYSQL_USER,
            password=BaseConfig.MYSQL_PASSWORD,
            database=BaseConfig.MYSQL_DB,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )

    @staticmethod
    def validate_api_key(raw_key: str) -> Dict[str, Any]:
        """验证 API Key"""
        try:
            # 检查格式
            if not raw_key.startswith('ck_'):
                return {'valid': False, 'message': 'API Key 格式错误'}

            # 从 MySQL 获取 API Key 数据
            conn = AuthService._get_mysql_connection()
            try:
                with conn.cursor() as cursor:
                    sql = """
                    SELECT id, name, description, keyPrefix, permissions, rateLimit, 
                           expiresAt, usageCount, lastUsedAt, enabled, createdBy, 
                           createdAt, updatedAt
                    FROM api_keys 
                    WHERE fullKey = %s
                    """
                    cursor.execute(sql, (raw_key,))
                    api_key_data = cursor.fetchone()
                    
                    if not api_key_data:
                        return {'valid': False, 'message': 'API Key 不存在或已过期'}

                    # 检查是否启用
                    if not api_key_data.get('enabled', True):
                        return {'valid': False, 'message': 'API Key 已禁用'}

                    # 检查过期时间
                    if not AuthService._check_expiry(api_key_data):
                        return {'valid': False, 'message': 'API Key 已过期'}

                    # 转换权限字段（JSON 字符串转列表）
                    if isinstance(api_key_data['permissions'], str):
                        api_key_data['permissions'] = json.loads(api_key_data['permissions'])

                    return {'valid': True, 'data': api_key_data}
            finally:
                conn.close()

        except Exception as e:
            logger.error(f'API Key 验证失败: {e}')
            return {'valid': False, 'message': '认证服务异常'}

    @staticmethod
    def check_permission(api_key_data: Dict, method: str, path: str) -> bool:
        """检查权限（细粒度权限控制）"""
        permissions = api_key_data.get('permissions', [])
        if not permissions:
            return False  # 无权限配置时拒绝访问

        # 全局权限直接通过
        if 'crawler:*' in permissions:
            return True

        method_lower = method.lower()
        
        # 构建具体的权限映射表
        permission_map = {
            # 任务管理
            ('get', '/tasks'): 'crawler:task:list',
            ('get', '/tasks/', ''): 'crawler:task:detail',
            ('post', '/tasks'): 'crawler:task:create',
            ('patch', '/tasks/', ''): 'crawler:task:update',
            ('delete', '/tasks/', ''): 'crawler:task:delete',
            ('post', '/tasks/', '/run'): 'crawler:task:run',
            ('post', '/tasks/', '/stop'): 'crawler:task:stop',
            
            # 结果管理
            ('get', '/results'): 'crawler:result:list',
            ('get', '/tasks/', '/results'): 'crawler:result:task',
            ('delete', '/results/', ''): 'crawler:result:delete',
            ('delete', '/tasks/', '/results'): 'crawler:result:clear',
            ('delete', '/tasks/', '/dedup'): 'crawler:result:dedup',
            
            # 爬虫管理
            ('get', '/spiders'): 'crawler:spider:list',
            ('post', '/spiders/test'): 'crawler:spider:test',
            
            # 文章管理
            ('get', '/articles'): 'crawler:article:list',
            ('get', '/articles/', ''): 'crawler:article:detail',
            ('get', '/articles/result/', ''): 'crawler:article:by-result',
            ('get', '/articles/task/', ''): 'crawler:article:by-task',
            ('get', '/articles/', '/versions'): 'crawler:article:versions',
            ('delete', '/articles/', ''): 'crawler:article:delete',
            ('delete', '/articles/task/', ''): 'crawler:article:delete-task',
            ('post', '/articles/', '/polish'): 'crawler:article:polish',
            ('get', '/articles/', '/polish/status'): 'crawler:article:polish-status',
            ('patch', '/articles/', '/set-latest'): 'crawler:article:set-latest',
            
            # 内容增强
            ('post', '/enrich/', ''): 'crawler:enrich:single',
            ('post', '/enrich/task/', ''): 'crawler:enrich:task',
            ('get', '/enrich/result/', ''): 'crawler:enrich:get',
            ('get', '/enrich/task/', '/list'): 'crawler:enrich:list',
            ('get', '/enrich/task/', '/status'): 'crawler:enrich:status',
            ('get', '/enrich/', '/enriching'): 'crawler:enrich:single-status',
            ('get', '/enrich/task/', '/enriching'): 'crawler:enrich:task-status',
            ('post', '/enrich/', '/stop'): 'crawler:enrich:stop-single',
            ('post', '/enrich/task/', '/stop'): 'crawler:enrich:stop-task',
            ('delete', '/enrich/', ''): 'crawler:enrich:delete',
            ('delete', '/enrich/task/', ''): 'crawler:enrich:delete-task',
            
            # 统计分析
            ('get', '/stats'): 'crawler:stats:global',
            ('get', '/tasks/', '/stats'): 'crawler:stats:task',
        }
        
        # 检查具体权限
        required_permission = AuthService._get_required_permission(method_lower, path, permission_map)
        
        return required_permission and required_permission in permissions

    @staticmethod
    def _get_required_permission(method: str, path: str, permission_map: Dict) -> str:
        """获取路径所需的权限"""
        # 移除 /crawler 前缀（如果存在）
        clean_path = path.replace('/crawler', '') if path.startswith('/crawler') else path
        
        for key, perm in permission_map.items():
            if len(key) == 2:  # 简单匹配 (method, path)
                key_method, key_path = key
                if method == key_method and clean_path == key_path:
                    return perm
            elif len(key) == 3:  # 带ID的路径匹配 (method, path_prefix, path_suffix)
                key_method, path_prefix, path_suffix = key
                if (method == key_method and 
                    clean_path.startswith(path_prefix) and 
                    (path_suffix == '' or clean_path.endswith(path_suffix))):
                    return perm
        
        return ''

    @staticmethod
    def check_rate_limit(api_key_data: Dict) -> bool:
        """检查限流"""
        rate_limit = api_key_data.get('rateLimit', 1000)
        if rate_limit <= 0:
            return True  # 无限制

        key = f'rate_limit:{api_key_data["id"]}'
        try:
            current = redis_client.get(key)
            
            if current is None:
                redis_client.setex(key, 3600, 1)
                return True
            
            if int(current) >= rate_limit:
                return False
            
            redis_client.incr(key)
            return True
        except Exception as e:
            logger.error(f'限流检查失败: {e}')
            return True  # 出错时允许通过

    @staticmethod
    def log_access(api_key_id: str, method: str, path: str, status_code: int, 
                   response_time: int, ip_address: str, user_agent: str):
        """记录访问日志到 Redis"""
        try:
            log_data = {
                'api_key_id': api_key_id,
                'method': method,
                'path': path,
                'status_code': status_code,
                'response_time': response_time,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'timestamp': int(time.time() * 1000)
            }
            
            # 使用 Redis List 存储访问日志，保留最近 1000 条
            log_key = f'api_key_logs:{api_key_id}'
            redis_client.lpush(log_key, json.dumps(log_data))
            redis_client.ltrim(log_key, 0, 999)  # 只保留最近 1000 条
            redis_client.expire(log_key, 86400 * 7)  # 7 天过期
            
        except Exception as e:
            logger.error(f'记录访问日志失败: {e}')

    @staticmethod
    def get_access_logs(api_key_id: str, limit: int = 50) -> list:
        """获取访问日志"""
        try:
            log_key = f'api_key_logs:{api_key_id}'
            logs = redis_client.lrange(log_key, 0, limit - 1)
            
            result = []
            for log in logs:
                try:
                    log_data = json.loads(log)
                    result.append(log_data)
                except json.JSONDecodeError:
                    continue
                    
            return result
        except Exception as e:
            logger.error(f'获取访问日志失败: {e}')
            return []

    @staticmethod
    def record_usage_stats(api_key_id: str, response_time: int):
        """向后端记录使用统计"""
        try:
            # 获取后端API地址
            backend_url = os.getenv('BACKEND_URL', 'http://localhost:8085')
            
            # 发送统计数据到后端
            requests.post(
                f'{backend_url}/api/v1/api-keys/record-usage',
                json={
                    'apiKeyId': api_key_id,
                    'responseTime': response_time
                },
                timeout=5
            )
        except Exception as e:
            # 统计记录失败不应该影响主要功能，只记录日志
            logger.warning(f'记录使用统计失败: {e}')

    @staticmethod
    def _check_expiry(api_key_data: Dict) -> bool:
        """检查是否过期"""
        expires_at = api_key_data.get('expiresAt')
        if not expires_at:
            return True
        
        from datetime import datetime
        try:
            if isinstance(expires_at, str):
                # 处理 ISO 格式的时间字符串
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            elif hasattr(expires_at, 'replace'):
                # 处理 datetime 对象
                expires_at = expires_at
            
            return datetime.now() < expires_at.replace(tzinfo=None)
        except Exception as e:
            logger.error(f'检查过期时间失败: {e}')
            return True  # 出错时认为未过期

    @staticmethod
    def update_usage_in_mysql(api_key_id: str):
        """更新 MySQL 中的使用统计"""
        try:
            conn = AuthService._get_mysql_connection()
            try:
                with conn.cursor() as cursor:
                    sql = """
                    UPDATE api_keys 
                    SET usageCount = usageCount + 1, lastUsedAt = NOW()
                    WHERE id = %s
                    """
                    cursor.execute(sql, (api_key_id,))
                    conn.commit()
            finally:
                conn.close()
        except Exception as e:
            logger.error(f'更新 MySQL 使用统计失败: {e}')
