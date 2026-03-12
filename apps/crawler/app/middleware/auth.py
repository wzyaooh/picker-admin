import time
import logging
from functools import wraps
from flask import request, jsonify, g
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

def require_api_key(f):
    """API Key 认证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        
        # 获取 API Key
        api_key = request.headers.get('X-API-Key') or request.args.get('api_key')
        if not api_key:
            return jsonify({
                'code': 401,
                'message': '缺少 API Key，请在请求头中添加 X-API-Key 或在查询参数中添加 api_key'
            }), 401

        # 验证 API Key
        auth_result = AuthService.validate_api_key(api_key)
        if not auth_result['valid']:
            return jsonify({
                'code': 401,
                'message': auth_result['message']
            }), 401

        # 权限检查
        if not AuthService.check_permission(auth_result['data'], request.method, request.path):
            return jsonify({
                'code': 403,
                'message': '权限不足，无法访问此接口'
            }), 403

        # 限流检查
        if not AuthService.check_rate_limit(auth_result['data']):
            return jsonify({
                'code': 429,
                'message': '请求过于频繁，请稍后再试'
            }), 429

        # 将 API Key 信息存储到 g 对象中
        g.api_key_data = auth_result['data']
        
        try:
            # 执行原函数
            result = f(*args, **kwargs)
            
            # 记录访问日志
            response_time = int((time.time() - start_time) * 1000)
            AuthService.log_access(
                api_key_id=g.api_key_data['id'],
                method=request.method,
                path=request.path,
                status_code=200,
                response_time=response_time,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent', '')
            )
            
            # 记录使用统计到后端
            AuthService.record_usage_stats(
                api_key_id=g.api_key_data['id'],
                response_time=response_time
            )
            
            # 更新 MySQL 中的使用统计
            AuthService.update_usage_in_mysql(g.api_key_data['id'])
            
            return result
            
        except Exception as e:
            # 记录错误日志
            response_time = int((time.time() - start_time) * 1000)
            AuthService.log_access(
                api_key_id=g.api_key_data['id'],
                method=request.method,
                path=request.path,
                status_code=500,
                response_time=response_time,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent', '')
            )
            
            # 即使出错也记录使用统计
            AuthService.record_usage_stats(
                api_key_id=g.api_key_data['id'],
                response_time=response_time
            )
            
            # 更新 MySQL 中的使用统计
            AuthService.update_usage_in_mysql(g.api_key_data['id'])
            
            raise

    return decorated_function
