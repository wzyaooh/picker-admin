from flask import request, current_app
from app.api import api_bp
from app.helpers import ok, fail
from app.models.article import GeneratedArticle
from app.services.polish_service import PolishService
from app.middleware.auth import require_api_key


@api_bp.route('/articles', methods=['GET'])
@require_api_key
def list_articles():
    """文章列表（分页 + 搜索），只返回最新版本"""
    page = request.args.get('pageNo', 1, type=int)
    page_size = request.args.get('pageSize', 20, type=int)
    keyword = request.args.get('keyword', '')
    items, total = GeneratedArticle.list_all(page, page_size, keyword)
    return ok({
        'pageData': [item.to_list_dict() for item in items],
        'total': total,
    })


@api_bp.route('/articles/<article_id>', methods=['GET'])
@require_api_key
def get_article(article_id):
    """获取文章详情（含完整内容）"""
    article = GeneratedArticle.find_by_id(article_id)
    if not article:
        return fail('文章不存在'), 404
    return ok(article.to_dict())


@api_bp.route('/articles/result/<result_id>', methods=['GET'])
@require_api_key
def get_article_by_result(result_id):
    """根据爬取结果 ID 获取关联文章（最新版本）"""
    article = GeneratedArticle.find_by_result_id(result_id)
    if not article:
        return fail('该结果暂无关联文章'), 404
    return ok(article.to_dict())


@api_bp.route('/articles/task/<task_id>', methods=['GET'])
@require_api_key
def list_articles_by_task(task_id):
    """获取任务下的所有文章（最新版本）"""
    page = request.args.get('pageNo', 1, type=int)
    page_size = request.args.get('pageSize', 20, type=int)
    items, total = GeneratedArticle.find_by_task(task_id, page, page_size)
    return ok({
        'pageData': [item.to_list_dict() for item in items],
        'total': total,
    })


@api_bp.route('/articles/<article_id>', methods=['DELETE'])
@require_api_key
def delete_article(article_id):
    """删除单篇文章"""
    article = GeneratedArticle.find_by_id(article_id)
    if not article:
        return fail('文章不存在'), 404
    article.delete()
    return ok(message='删除成功')


@api_bp.route('/articles/task/<task_id>', methods=['DELETE'])
@require_api_key
def delete_articles_by_task(task_id):
    """删除任务下所有文章"""
    count = GeneratedArticle._col().count_documents({'task_id': task_id})
    GeneratedArticle.delete_by_task(task_id)
    return ok(data={'deleted': count}, message=f'已清除 {count} 篇文章')


# ==================== 润色 + 版本管理 ====================


@api_bp.route('/articles/<article_id>/polish', methods=['POST'])
@require_api_key
def polish_article(article_id):
    """对文章执行润色，生成新版本（异步）"""
    data = request.get_json(silent=True) or {}
    custom_instructions = data.get('customInstructions', '')
    result = PolishService.polish_async(article_id, current_app._get_current_object(), custom_instructions=custom_instructions)
    if isinstance(result, dict) and 'error' in result:
        return fail(result['error']), 400
    return ok(result), 202


@api_bp.route('/articles/<article_id>/polish/status', methods=['GET'])
@require_api_key
def get_polish_status(article_id):
    """查询润色进度"""
    status = PolishService.get_polish_status(article_id)
    return ok(status)


@api_bp.route('/articles/<article_id>/versions', methods=['GET'])
@require_api_key
def get_article_versions(article_id):
    """获取文章所有版本列表"""
    article = GeneratedArticle.find_by_id(article_id)
    if not article:
        return fail('文章不存在'), 404
    group_id = article.group_id or article.id
    # 兼容旧数据：如果 group_id 为空，回填到数据库
    if not article.group_id:
        GeneratedArticle._col().update_one(
            {'_id': article._id},
            {'$set': {'group_id': group_id, 'is_latest': True, 'version': 1}},
        )
    versions = GeneratedArticle.find_versions(group_id)
    return ok([v.to_version_dict() for v in versions])


@api_bp.route('/articles/<article_id>/set-latest', methods=['PATCH'])
@require_api_key
def set_latest_version(article_id):
    """将指定版本设为最新版本"""
    article = GeneratedArticle.find_by_id(article_id)
    if not article:
        return fail('文章不存在'), 404
    if article.status != 'success':
        return fail('只能将成功状态的版本设为最新'), 400
    group_id = article.group_id or article.id
    # 兼容旧数据
    if not article.group_id:
        GeneratedArticle._col().update_one(
            {'_id': article._id},
            {'$set': {'group_id': group_id, 'is_latest': True, 'version': 1}},
        )
    GeneratedArticle.set_latest(article_id, group_id)
    return ok(message=f'已将 v{article.version} 设为最新版本')


@api_bp.route('/articles/<article_id>/version', methods=['DELETE'])
@require_api_key
def delete_article_version(article_id):
    """删除指定版本（不能删除唯一版本，删除最新版本时自动切换）"""
    article = GeneratedArticle.find_by_id(article_id)
    if not article:
        return fail('文章不存在'), 404

    group_id = article.group_id or article.id

    # 不能删除唯一版本
    version_count = GeneratedArticle.count_versions(group_id)
    if version_count <= 1:
        return fail('不能删除唯一版本，请使用删除文章功能'), 400

    was_latest = article.is_latest

    # 删除该版本
    article.delete()

    # 如果删除的是最新版本，自动将上一个最高版本设为最新
    if was_latest:
        versions = GeneratedArticle.find_versions(group_id)
        if versions:
            # 优先选 success 状态的最高版本
            new_latest = next((v for v in versions if v.status == 'success'), versions[0])
            GeneratedArticle.set_latest(new_latest.id, group_id)

    return ok(message=f'已删除 v{article.version}')
