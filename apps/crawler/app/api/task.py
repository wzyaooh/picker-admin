from flask import request, current_app
from app.api import api_bp
from app.helpers import ok, fail
from app.services.task_service import TaskService
from app.middleware.auth import require_api_key


@api_bp.route('/tasks', methods=['GET'])
@require_api_key
def list_tasks():
    """获取任务列表（分页）"""
    page = request.args.get('pageNo', 1, type=int)
    page_size = request.args.get('pageSize', 10, type=int)
    keyword = request.args.get('keyword', '', type=str)
    
    result = TaskService.list_tasks(page, page_size, keyword)
    return ok(result)


@api_bp.route('/tasks/<task_id>', methods=['GET'])
@require_api_key
def get_task(task_id):
    """获取任务详情"""
    task = TaskService.get_task(task_id)
    if not task:
        return fail('任务不存在'), 404
    return ok(task.to_dict())


@api_bp.route('/tasks', methods=['POST'])
@require_api_key
def create_task():
    """创建任务"""
    data = request.get_json()
    if not data:
        return fail('请求体不能为空'), 400
    
    required = ('name', 'spiderName', 'targetUrl')
    for field in required:
        if field not in data:
            return fail(f'缺少必填字段: {field}'), 400
    
    result = TaskService.create_task(data)
    if isinstance(result, dict) and 'error' in result:
        return fail(result['error']), 400
    
    return ok(result.to_dict()), 201


@api_bp.route('/tasks/<task_id>', methods=['PATCH'])
@require_api_key
def update_task(task_id):
    """更新任务"""
    data = request.get_json()
    if not data:
        return fail('请求体不能为空'), 400
    
    result = TaskService.update_task(task_id, data)
    if result is None:
        return fail('任务不存在'), 404
    if isinstance(result, dict) and 'error' in result:
        return fail(result['error']), 400
    
    return ok(result.to_dict())


@api_bp.route('/tasks/<task_id>', methods=['DELETE'])
@require_api_key
def delete_task(task_id):
    """删除任务"""
    success = TaskService.delete_task(task_id)
    if not success:
        return fail('任务不存在'), 404
    return ok({'message': '删除成功'})


@api_bp.route('/tasks/<task_id>/run', methods=['POST'])
@require_api_key
def run_task(task_id):
    """执行任务"""
    result = TaskService.run_task(task_id, current_app)
    if 'error' in result:
        return fail(result['error']), 400
    return ok(result)


@api_bp.route('/tasks/<task_id>/stop', methods=['POST'])
@require_api_key
def stop_task(task_id):
    """停止任务"""
    data = request.get_json() or {}
    force = data.get('force', False)
    
    result = TaskService.stop_task(task_id, force)
    if 'error' in result:
        return fail(result['error']), 400
    return ok(result)


@api_bp.route('/tasks/<task_id>/dedup', methods=['DELETE'])
@require_api_key
def clear_dedup(task_id):
    """清除任务的去重记录"""
    success = TaskService.clear_dedup(task_id)
    return ok({'cleared': success})


@api_bp.route('/tasks/<task_id>/results', methods=['GET'])
@require_api_key
def get_task_results(task_id):
    """获取任务的爬取结果"""
    page = request.args.get('pageNo', 1, type=int)
    page_size = request.args.get('pageSize', 20, type=int)
    
    result = TaskService.get_results(task_id, page, page_size)
    return ok(result)


@api_bp.route('/tasks/<task_id>/results', methods=['DELETE'])
@require_api_key
def clear_results(task_id):
    """清除任务的所有爬取结果"""
    deleted = TaskService.clear_results(task_id)
    return ok({'deleted': deleted})


@api_bp.route('/results', methods=['GET'])
@require_api_key
def get_all_results():
    """获取所有爬取结果（分页）"""
    from app.models.result import CrawlResult
    
    page = request.args.get('pageNo', 1, type=int)
    page_size = request.args.get('pageSize', 20, type=int)
    keyword = request.args.get('keyword', '', type=str)
    task_id = request.args.get('taskId', '', type=str)
    task_name = request.args.get('taskName', '', type=str)
    
    query = {}
    if keyword:
        query['$or'] = [
            {'title': {'$regex': keyword, '$options': 'i'}},
            {'url': {'$regex': keyword, '$options': 'i'}},
        ]
    if task_id:
        query['task_id'] = task_id
    
    items, total = CrawlResult.find_paginated(query, page, page_size)
    
    # 如果需要任务名称，需要关联查询
    result_data = []
    for item in items:
        item_dict = item.to_dict()
        if task_name or not task_id:  # 需要显示任务名称
            from app.models.task import CrawlTask
            task = CrawlTask.find_by_id(item.task_id)
            item_dict['taskName'] = task.name if task else '未知任务'
        result_data.append(item_dict)
    
    return ok({
        'pageData': result_data,
        'total': total,
    })


@api_bp.route('/results/<result_id>', methods=['DELETE'])
@require_api_key
def delete_single_result(result_id):
    """删除单个爬取结果"""
    from app.models.result import CrawlResult
    
    result = CrawlResult.find_by_id(result_id)
    if not result:
        return fail('结果不存在'), 404
    
    result.delete()
    return ok({'message': '删除成功'})
