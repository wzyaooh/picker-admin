from flask import request
from app.api import api_bp
from app.helpers import ok, fail
from app.services.spider_service import SpiderService
from app.middleware.auth import require_api_key


@api_bp.route('/spiders', methods=['GET'])
@require_api_key
def list_spiders():
    """获取所有可用爬虫列表"""
    spiders = SpiderService.list_spiders()
    return ok(spiders)


@api_bp.route('/spiders/test', methods=['POST'])
@require_api_key
def test_spider():
    """测试爬虫 - 立即执行并返回结果"""
    data = request.get_json()
    if not data:
        return fail('请求体不能为空'), 400

    spider_name = data.get('spiderName', 'generic')
    url = data.get('url')
    config = data.get('config')

    if not url:
        return fail('缺少 url 字段'), 400

    spider = None
    try:
        spider = SpiderService.get_spider(spider_name, config)
        results = spider.run(url)
        return ok(results)
    except ValueError as e:
        return fail(str(e)), 400
    except Exception as e:
        return fail(f'爬取失败: {str(e)}'), 500
    finally:
        if spider:
            spider.close()
