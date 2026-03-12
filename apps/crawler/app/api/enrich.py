from flask import request, current_app
from app.api import api_bp
from app.helpers import ok, fail
from app.services.enrich_service import EnrichService
from app.middleware.auth import require_api_key


@api_bp.route('/enrich/<result_id>', methods=['POST'])
@require_api_key
def enrich_single(result_id):
    """对单条爬取结果进行 LLM 增强（异步）"""
    result = EnrichService.enrich_single_async(result_id, current_app._get_current_object())
    if isinstance(result, dict) and 'error' in result:
        return fail(result['error']), 400
    return ok(result), 202


@api_bp.route('/enrich/<result_id>/stop', methods=['POST'])
@require_api_key
def stop_enrich_single(result_id):
    """停止单条增强"""
    result = EnrichService.stop_enrich_single(result_id)
    if 'error' in result:
        return fail(result['error']), 400
    return ok(result)


@api_bp.route('/enrich/<result_id>/enriching', methods=['GET'])
@require_api_key
def is_single_enriching(result_id):
    """检查单条结果是否正在增强中"""
    enriching = EnrichService.is_single_enriching(result_id)
    return ok({'enriching': enriching})


@api_bp.route('/enrich/task/<task_id>', methods=['POST'])
@require_api_key
def enrich_task(task_id):
    """对任务的所有结果进行批量 LLM 增强"""
    result = EnrichService.enrich_task(task_id, current_app._get_current_object())
    if isinstance(result, dict) and 'error' in result:
        return fail(result['error']), 400
    return ok(result)


@api_bp.route('/enrich/result/<result_id>', methods=['GET'])
@require_api_key
def get_enriched(result_id):
    """获取单条增强结果"""
    enriched = EnrichService.get_enriched(result_id)
    if not enriched:
        return fail('增强结果不存在'), 404
    return ok(enriched.to_dict())


@api_bp.route('/enrich/task/<task_id>/list', methods=['GET'])
@require_api_key
def list_enriched(task_id):
    """获取任务的增强结果列表"""
    page = request.args.get('pageNo', 1, type=int)
    page_size = request.args.get('pageSize', 20, type=int)
    result = EnrichService.list_by_task(task_id, page, page_size)
    return ok(result)


@api_bp.route('/enrich/task/<task_id>/status', methods=['GET'])
@require_api_key
def get_enrich_status_map(task_id):
    """获取任务下所有结果的增强状态映射 {resultId: status}"""
    status_map = EnrichService.get_status_map(task_id)
    return ok(status_map)


@api_bp.route('/enrich/<enriched_id>', methods=['DELETE'])
@require_api_key
def delete_enriched(enriched_id):
    """删除单条增强结果"""
    success = EnrichService.delete_enriched(enriched_id)
    if not success:
        return fail('增强结果不存在'), 404
    return ok(message='删除成功')


@api_bp.route('/enrich/<result_id>/clear', methods=['POST'])
@require_api_key
def clear_enrich_status(result_id):
    """清理增强状态（用于解决卡住的情况）"""
    result = EnrichService.clear_status(result_id)
    if 'error' in result:
        return fail(result['error']), 400
    return ok(result)


@api_bp.route('/enrich/task/<task_id>', methods=['DELETE'])
@require_api_key
def delete_enriched_by_task(task_id):
    """删除任务的所有增强结果"""
    count = EnrichService.delete_by_task(task_id)
    return ok(data={'deleted': count}, message=f'已清除 {count} 条增强结果')


@api_bp.route('/enrich/task/<task_id>/stop', methods=['POST'])
@require_api_key
def stop_enrich_task(task_id):
    """停止批量增强"""
    result = EnrichService.stop_enrich(task_id)
    if 'error' in result:
        return fail(result['error']), 400
    return ok(result)


@api_bp.route('/enrich/task/<task_id>/enriching', methods=['GET'])
@require_api_key
def is_enriching(task_id):
    """检查任务是否正在增强中"""
    enriching = EnrichService.is_enriching(task_id)
    return ok({'enriching': enriching})
