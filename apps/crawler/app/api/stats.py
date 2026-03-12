from flask import request

from app.api import api_bp
from app.helpers import ok, fail
from app.services.stats_service import StatsService
from app.services.task_service import TaskService
from app.middleware.auth import require_api_key


@api_bp.route('/stats', methods=['GET'])
@require_api_key
def get_global_stats():
    exclude = request.args.get('exclude', '')
    include = request.args.get('include', '')
    exclude_spiders = [s.strip() for s in exclude.split(',') if s.strip()] if exclude else None
    include_spiders = [s.strip() for s in include.split(',') if s.strip()] if include else None
    stats = StatsService.get_global_stats(
        exclude_spiders=exclude_spiders,
        include_spiders=include_spiders,
    )
    return ok(stats)


@api_bp.route('/tasks/<task_id>/stats', methods=['GET'])
@require_api_key
def get_task_stats(task_id):
    task = TaskService.get_task(task_id)
    if not task:
        return fail('任务不存在'), 404
    stats = StatsService.get_task_stats(task_id)
    return ok(stats)
