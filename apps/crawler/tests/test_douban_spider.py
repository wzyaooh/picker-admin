"""DoubanSpider 单元测试

Mock HTTP 响应测试解析逻辑、Redis 缓存行为和错误处理。
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.spiders.douban import DoubanSpider, DOUBAN_CACHE_PREFIX, DOUBAN_CACHE_TTL


# ==================== 测试用 HTML 片段 ====================

SEARCH_RESULT_HTML = """
<html><body>
<div class="result">
  <div class="content">
    <h3><a href="https://movie.douban.com/subject/1292052/">肖申克的救赎</a></h3>
  </div>
</div>
<div class="result">
  <div class="content">
    <h3><a href="https://movie.douban.com/subject/9999999/">其他结果</a></h3>
  </div>
</div>
</body></html>
"""

SEARCH_NO_RESULT_HTML = """
<html><body>
<div class="result">
  <div class="content">
    <h3><a href="https://www.douban.com/other/page">非影视结果</a></h3>
  </div>
</div>
</body></html>
"""

DETAIL_PAGE_HTML = """
<html><body>
<div id="interest_sectl">
  <strong class="rating_num">9.7</strong>
</div>
<div id="hot-comments">
  <div class="comment-item">
    <span class="short">希望是个好东西</span>
  </div>
  <div class="comment-item">
    <span class="short">经典中的经典</span>
  </div>
  <div class="comment-item">
    <span class="short">自由的力量</span>
  </div>
</div>
</body></html>
"""

DETAIL_NO_RATING_HTML = """
<html><body>
<div id="interest_sectl">
  <strong class="rating_num"></strong>
</div>
<div id="hot-comments"></div>
</body></html>
"""


# ==================== 辅助函数 ====================


def _make_response(html: str) -> MagicMock:
    """创建 mock Response 对象"""
    resp = MagicMock()
    resp.text = html
    resp.status_code = 200
    resp.raise_for_status = MagicMock()
    return resp


# ==================== 测试类 ====================


class TestDoubanSpiderInit:
    """初始化测试"""

    def test_spider_name(self):
        spider = DoubanSpider()
        assert spider.name == 'douban'

    def test_session_headers(self):
        spider = DoubanSpider()
        headers = spider.session.headers
        assert 'zh-CN' in headers.get('Accept-Language', '')
        assert 'douban.com' in headers.get('Referer', '')


class TestExtractSubjectUrl:
    """搜索结果链接提取测试"""

    def test_extract_first_movie_link(self):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(SEARCH_RESULT_HTML, 'lxml')
        url = DoubanSpider._extract_subject_url(soup)
        assert url == 'https://movie.douban.com/subject/1292052/'

    def test_no_movie_link_returns_none(self):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(SEARCH_NO_RESULT_HTML, 'lxml')
        url = DoubanSpider._extract_subject_url(soup)
        assert url is None

    def test_empty_page_returns_none(self):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup('<html><body></body></html>', 'lxml')
        url = DoubanSpider._extract_subject_url(soup)
        assert url is None


class TestExtractRating:
    """评分提取测试"""

    def test_extract_valid_rating(self):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(DETAIL_PAGE_HTML, 'lxml')
        rating = DoubanSpider._extract_rating(soup)
        assert rating == 9.7

    def test_empty_rating_returns_none(self):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(DETAIL_NO_RATING_HTML, 'lxml')
        rating = DoubanSpider._extract_rating(soup)
        assert rating is None

    def test_no_rating_element_returns_none(self):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup('<html><body></body></html>', 'lxml')
        rating = DoubanSpider._extract_rating(soup)
        assert rating is None


class TestExtractHotComments:
    """热门短评提取测试"""

    def test_extract_comments(self):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(DETAIL_PAGE_HTML, 'lxml')
        comments = DoubanSpider._extract_hot_comments(soup)
        assert len(comments) == 3
        assert '希望是个好东西' in comments
        assert '经典中的经典' in comments
        assert '自由的力量' in comments

    def test_no_comments_returns_empty(self):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(DETAIL_NO_RATING_HTML, 'lxml')
        comments = DoubanSpider._extract_hot_comments(soup)
        assert comments == []

    def test_limit_comments(self):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(DETAIL_PAGE_HTML, 'lxml')
        comments = DoubanSpider._extract_hot_comments(soup, limit=2)
        assert len(comments) == 2


class TestSearchByTitle:
    """search_by_title 方法测试"""

    @patch('app.spiders.douban.redis_client')
    def test_cache_hit_returns_cached_data(self, mock_redis):
        """Redis 缓存命中时直接返回"""
        cached_data = {
            'doubanRating': 9.7,
            'doubanUrl': 'https://movie.douban.com/subject/1292052/',
            'hotComments': ['好看'],
        }
        mock_redis.get.return_value = json.dumps(cached_data)

        spider = DoubanSpider()
        result = spider.search_by_title('肖申克的救赎', tmdb_id=278)

        assert result == cached_data
        mock_redis.get.assert_called_once_with(f'{DOUBAN_CACHE_PREFIX}278')

    @patch('app.spiders.douban.time.sleep')
    @patch('app.spiders.douban.redis_client')
    def test_search_and_parse_success(self, mock_redis, mock_sleep):
        """成功搜索并解析豆瓣数据"""
        mock_redis.get.return_value = None  # cache miss

        spider = DoubanSpider()

        search_resp = _make_response(SEARCH_RESULT_HTML)
        detail_resp = _make_response(DETAIL_PAGE_HTML)

        with patch.object(spider, 'fetch', side_effect=[search_resp, detail_resp]):
            result = spider.search_by_title('肖申克的救赎', year='1994', tmdb_id=278)

        assert result is not None
        assert result['doubanRating'] == 9.7
        assert result['doubanUrl'] == 'https://movie.douban.com/subject/1292052/'
        assert len(result['hotComments']) == 3

        # Verify cache write
        mock_redis.set.assert_called_once()
        call_args = mock_redis.set.call_args
        assert call_args[0][0] == f'{DOUBAN_CACHE_PREFIX}278'
        assert call_args[1]['ex'] == DOUBAN_CACHE_TTL

    @patch('app.spiders.douban.time.sleep')
    @patch('app.spiders.douban.redis_client')
    def test_no_search_result_returns_none(self, mock_redis, mock_sleep):
        """搜索无结果时返回 None"""
        mock_redis.get.return_value = None

        spider = DoubanSpider()
        search_resp = _make_response(SEARCH_NO_RESULT_HTML)

        with patch.object(spider, 'fetch', return_value=search_resp):
            result = spider.search_by_title('不存在的电影', tmdb_id=99999)

        assert result is None

    @patch('app.spiders.douban.redis_client')
    def test_fetch_error_returns_none(self, mock_redis):
        """HTTP 请求失败时返回 None"""
        mock_redis.get.return_value = None

        spider = DoubanSpider()

        with patch.object(spider, 'fetch', side_effect=Exception('Connection error')):
            result = spider.search_by_title('肖申克的救赎', tmdb_id=278)

        assert result is None

    @patch('app.spiders.douban.time.sleep')
    @patch('app.spiders.douban.redis_client')
    def test_no_tmdb_id_skips_cache(self, mock_redis, mock_sleep):
        """tmdb_id 为 None 时跳过缓存读写"""
        spider = DoubanSpider()

        search_resp = _make_response(SEARCH_RESULT_HTML)
        detail_resp = _make_response(DETAIL_PAGE_HTML)

        with patch.object(spider, 'fetch', side_effect=[search_resp, detail_resp]):
            result = spider.search_by_title('肖申克的救赎')

        assert result is not None
        assert result['doubanRating'] == 9.7
        mock_redis.get.assert_not_called()
        mock_redis.set.assert_not_called()

    @patch('app.spiders.douban.redis_client')
    def test_redis_read_error_continues(self, mock_redis):
        """Redis 读取失败时继续搜索"""
        mock_redis.get.side_effect = Exception('Redis down')

        spider = DoubanSpider()
        search_resp = _make_response(SEARCH_RESULT_HTML)
        detail_resp = _make_response(DETAIL_PAGE_HTML)

        with patch.object(spider, 'fetch', side_effect=[search_resp, detail_resp]):
            with patch('app.spiders.douban.time.sleep'):
                result = spider.search_by_title('肖申克的救赎', tmdb_id=278)

        assert result is not None
        assert result['doubanRating'] == 9.7


class TestParse:
    """parse 方法测试"""

    def test_parse_returns_empty_list(self):
        spider = DoubanSpider()
        assert spider.parse('https://example.com') == []
