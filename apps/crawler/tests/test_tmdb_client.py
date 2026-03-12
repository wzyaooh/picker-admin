"""TMDBClient 单元测试

测试 URL 构建、参数传递、速率限制、错误处理和 normalize_result 输出格式。
使用 mock 替代真实 HTTP 请求。
"""

import time
from unittest.mock import MagicMock, patch

import pytest
import requests

from app.services.movie.tmdb_client import TMDBClient


# ==================== __init__ 测试 ====================


class TestTMDBClientInit:
    """TMDBClient 初始化测试"""

    def test_init_success(self, app_context):
        """正常初始化，读取配置"""
        client = TMDBClient()
        assert client.api_key == 'test-api-key-12345'
        assert client.base_url == 'https://api.themoviedb.org/3'
        assert client.language == 'zh-CN'
        assert client._min_interval == 0.25

    def test_init_missing_api_key(self, app_context):
        """未配置 TMDB_API_KEY 时抛出 ValueError"""
        app_context.config['TMDB_API_KEY'] = ''
        with pytest.raises(ValueError, match='TMDB API 密钥未配置'):
            TMDBClient()

    def test_init_custom_base_url(self, app_context):
        """自定义 TMDB_BASE_URL"""
        app_context.config['TMDB_BASE_URL'] = 'https://custom.tmdb.api/3'
        client = TMDBClient()
        assert client.base_url == 'https://custom.tmdb.api/3'

    def test_init_with_http_proxy(self, app_context):
        """配置 HTTP_PROXY 时 session 设置代理"""
        app_context.config['HTTP_PROXY'] = 'http://127.0.0.1:7890'
        # 重置共享 session 以便重新创建
        TMDBClient._shared_session = None
        client = TMDBClient()
        assert client.session.proxies['http'] == 'http://127.0.0.1:7890'
        assert client.session.proxies['https'] == 'http://127.0.0.1:7890'

    def test_init_without_http_proxy(self, app_context):
        """未配置 HTTP_PROXY 时 session 不设置代理"""
        app_context.config['HTTP_PROXY'] = ''
        client = TMDBClient()
        assert not client.session.proxies


# ==================== _request 测试 ====================


class TestTMDBClientRequest:
    """_request 方法测试"""

    def test_request_injects_api_key_and_language(self, app_context):
        """请求自动注入 api_key 和 language 参数"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client._request('/search/movie', {'query': 'test'})
            call_kwargs = mock_get.call_args
            params = call_kwargs.kwargs.get('params') or call_kwargs[1].get('params')
            assert params['api_key'] == 'test-api-key-12345'
            assert params['language'] == 'zh-CN'
            assert params['query'] == 'test'

    def test_request_builds_correct_url(self, app_context):
        """请求构建正确的完整 URL"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {}
        mock_resp.raise_for_status = MagicMock()

        with patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client._request('/movie/550')
            url = mock_get.call_args[0][0]
            assert url == 'https://api.themoviedb.org/3/movie/550'

    def test_request_rate_limiting(self, app_context):
        """速率限制：连续请求间隔不小于 0.25s"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {}
        mock_resp.raise_for_status = MagicMock()

        with patch.object(client.session, 'get', return_value=mock_resp):
            client._request('/test1')
            t1 = time.time()
            client._request('/test2')
            t2 = time.time()
            # 第二次请求应至少等待 _min_interval
            assert t2 - t1 >= 0.2  # 留一点容差

    def test_request_http_error_raises(self, app_context):
        """HTTP 错误时抛出异常并记录日志"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.raise_for_status.side_effect = requests.HTTPError(
            response=mock_resp
        )

        with patch.object(client.session, 'get', return_value=mock_resp):
            with pytest.raises(requests.HTTPError):
                client._request('/movie/999999')

    def test_request_connection_error_raises(self, app_context):
        """网络连接错误时抛出异常"""
        client = TMDBClient()

        with patch.object(
            client.session, 'get',
            side_effect=requests.ConnectionError('Connection refused'),
        ):
            with pytest.raises(requests.ConnectionError):
                client._request('/test')


# ==================== search 测试 ====================


class TestTMDBClientSearch:
    """search 方法测试"""

    def test_search_all_uses_multi_endpoint(self, app_context):
        """media_type='all' 使用 /search/multi"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': [], 'total_results': 0}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.search('inception', media_type='all')
            url = mock_get.call_args[0][0]
            assert '/search/multi' in url

    def test_search_movie_uses_movie_endpoint(self, app_context):
        """media_type='movie' 使用 /search/movie"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.search('inception', media_type='movie')
            url = mock_get.call_args[0][0]
            assert '/search/movie' in url

    def test_search_tv_uses_tv_endpoint(self, app_context):
        """media_type='tv' 使用 /search/tv"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.search('breaking bad', media_type='tv')
            url = mock_get.call_args[0][0]
            assert '/search/tv' in url

    def test_search_passes_query_and_page(self, app_context):
        """搜索传递 query 和 page 参数"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.search('test query', page=3)
            params = mock_get.call_args.kwargs.get('params') or mock_get.call_args[1].get('params')
            assert params['query'] == 'test query'
            assert params['page'] == 3

    def test_search_returns_cached_result(self, app_context):
        """搜索命中缓存时直接返回，不发起 HTTP 请求"""
        client = TMDBClient()
        cached_data = {'results': [{'id': 1}], 'total_results': 1}

        with patch('app.services.movie.tmdb_client._cache_get', return_value=cached_data), \
             patch.object(client.session, 'get') as mock_get:
            result = client.search('cached query')
            mock_get.assert_not_called()
            assert result == cached_data


# ==================== get_detail 测试 ====================


class TestTMDBClientGetDetail:
    """get_detail 方法测试"""

    def test_get_detail_movie(self, app_context):
        """电影详情使用 /movie/{id}"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'id': 550, 'title': 'Fight Club'}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            result = client.get_detail(550, 'movie')
            url = mock_get.call_args[0][0]
            assert '/movie/550' in url
            params = mock_get.call_args.kwargs.get('params') or mock_get.call_args[1].get('params')
            assert params['append_to_response'] == 'credits,similar,external_ids'

    def test_get_detail_tv(self, app_context):
        """电视剧详情使用 /tv/{id}"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'id': 1396, 'name': 'Breaking Bad'}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.get_detail(1396, 'tv')
            url = mock_get.call_args[0][0]
            assert '/tv/1396' in url

    def test_get_detail_returns_cached(self, app_context):
        """详情命中缓存时直接返回"""
        client = TMDBClient()
        cached = {'id': 550, 'title': 'Fight Club'}

        with patch('app.services.movie.tmdb_client._cache_get', return_value=cached), \
             patch.object(client.session, 'get') as mock_get:
            result = client.get_detail(550, 'movie')
            mock_get.assert_not_called()
            assert result == cached


# ==================== get_trending / get_popular 测试 ====================


class TestTMDBClientTrendingPopular:
    """趋势和热门方法测试"""

    def test_get_trending_builds_correct_endpoint(self, app_context):
        """趋势 API 构建正确的端点"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.get_trending(media_type='movie', time_window='day', page=2)
            url = mock_get.call_args[0][0]
            assert '/trending/movie/day' in url

    def test_get_popular_movie(self, app_context):
        """热门电影使用 /movie/popular"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.get_popular(media_type='movie')
            url = mock_get.call_args[0][0]
            assert '/movie/popular' in url

    def test_get_popular_tv(self, app_context):
        """热门电视剧使用 /tv/popular"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.get_popular(media_type='tv')
            url = mock_get.call_args[0][0]
            assert '/tv/popular' in url


# ==================== discover 测试 ====================


class TestTMDBClientDiscover:
    """discover 方法测试"""

    def test_discover_genre_filter(self, app_context):
        """Discover 类型筛选映射到 with_genres"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.discover('movie', genre_id=28)
            params = mock_get.call_args.kwargs.get('params') or mock_get.call_args[1].get('params')
            assert params['with_genres'] == 28

    def test_discover_year_range_movie(self, app_context):
        """Discover 电影年份范围映射到 primary_release_date"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.discover('movie', year_from=2020, year_to=2023)
            params = mock_get.call_args.kwargs.get('params') or mock_get.call_args[1].get('params')
            assert params['primary_release_date.gte'] == '2020-01-01'
            assert params['primary_release_date.lte'] == '2023-12-31'

    def test_discover_year_range_tv(self, app_context):
        """Discover 电视剧年份范围映射到 first_air_date"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.discover('tv', year_from=2020, year_to=2023)
            params = mock_get.call_args.kwargs.get('params') or mock_get.call_args[1].get('params')
            assert params['first_air_date.gte'] == '2020-01-01'
            assert params['first_air_date.lte'] == '2023-12-31'

    def test_discover_rating_range(self, app_context):
        """Discover 评分范围映射"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.discover('movie', rating_min=7.0, rating_max=9.0)
            params = mock_get.call_args.kwargs.get('params') or mock_get.call_args[1].get('params')
            assert params['vote_average.gte'] == 7.0
            assert params['vote_average.lte'] == 9.0

    def test_discover_region_filter(self, app_context):
        """Discover 地区筛选映射"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.discover('movie', region='CN')
            params = mock_get.call_args.kwargs.get('params') or mock_get.call_args[1].get('params')
            assert params['with_origin_country'] == 'CN'

    def test_discover_sort_by_mapping(self, app_context):
        """Discover 排序方式映射"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.discover('movie', sort_by='rating_desc')
            params = mock_get.call_args.kwargs.get('params') or mock_get.call_args[1].get('params')
            assert params['sort_by'] == 'vote_average.desc'

    def test_discover_rating_min_zero(self, app_context):
        """Discover rating_min=0 应被正确传递（不被 falsy 过滤）"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'results': []}
        mock_resp.raise_for_status = MagicMock()

        with patch('app.services.movie.tmdb_client._cache_get', return_value=None), \
             patch('app.services.movie.tmdb_client._cache_set'), \
             patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            client.discover('movie', rating_min=0)
            params = mock_get.call_args.kwargs.get('params') or mock_get.call_args[1].get('params')
            assert params['vote_average.gte'] == 0


# ==================== get_genres 测试 ====================


class TestTMDBClientGetGenres:
    """get_genres 方法测试"""

    def test_get_genres_movie(self, app_context):
        """获取电影类型列表"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            'genres': [
                {'id': 28, 'name': '动作'},
                {'id': 12, 'name': '冒险'},
            ]
        }
        mock_resp.raise_for_status = MagicMock()

        with patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            genres = client.get_genres('movie')
            url = mock_get.call_args[0][0]
            assert '/genre/movie/list' in url
            assert len(genres) == 2
            assert genres[0]['id'] == 28

    def test_get_genres_tv(self, app_context):
        """获取电视剧类型列表"""
        client = TMDBClient()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'genres': [{'id': 10759, 'name': '动作冒险'}]}
        mock_resp.raise_for_status = MagicMock()

        with patch.object(client.session, 'get', return_value=mock_resp) as mock_get:
            genres = client.get_genres('tv')
            url = mock_get.call_args[0][0]
            assert '/genre/tv/list' in url


# ==================== normalize_result 测试 ====================


class TestNormalizeResult:
    """normalize_result 静态方法测试（不需要 Flask 上下文）"""

    def test_normalize_movie_result(self):
        """标准化电影结果"""
        raw = {
            'id': 550,
            'title': 'Fight Club',
            'original_title': 'Fight Club',
            'poster_path': '/pB8BM7pdSp6B6Ih7QI4S2t0POoT.jpg',
            'backdrop_path': '/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg',
            'overview': 'A ticking-Loss bomb insomniac...',
            'vote_average': 8.4,
            'vote_count': 26000,
            'release_date': '1999-10-15',
            'genre_ids': [18, 53],
            'popularity': 61.4,
        }
        result = TMDBClient.normalize_result(raw, media_type='movie')

        assert result['tmdbId'] == 550
        assert result['mediaType'] == 'movie'
        assert result['title'] == 'Fight Club'
        assert result['originalTitle'] == 'Fight Club'
        assert result['posterPath'] == '/pB8BM7pdSp6B6Ih7QI4S2t0POoT.jpg'
        assert result['backdropPath'] == '/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg'
        assert result['voteAverage'] == 8.4
        assert result['voteCount'] == 26000
        assert result['releaseDate'] == '1999-10-15'
        assert result['genreIds'] == [18, 53]
        assert result['popularity'] == 61.4
        assert result['hotScore'] is None
        assert result['hotReasons'] == []

    def test_normalize_tv_result(self):
        """标准化电视剧结果（name / original_name / first_air_date）"""
        raw = {
            'id': 1396,
            'name': '绝命毒师',
            'original_name': 'Breaking Bad',
            'poster_path': '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
            'backdrop_path': '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
            'overview': '一位高中化学老师...',
            'vote_average': 8.9,
            'vote_count': 12000,
            'first_air_date': '2008-01-20',
            'genre_ids': [18, 80],
            'popularity': 150.2,
        }
        result = TMDBClient.normalize_result(raw, media_type='tv')

        assert result['tmdbId'] == 1396
        assert result['mediaType'] == 'tv'
        assert result['title'] == '绝命毒师'
        assert result['originalTitle'] == 'Breaking Bad'
        assert result['releaseDate'] == '2008-01-20'

    def test_normalize_multi_search_result(self):
        """/search/multi 结果自带 media_type 字段"""
        raw = {
            'id': 550,
            'media_type': 'movie',
            'title': 'Fight Club',
            'original_title': 'Fight Club',
            'vote_average': 8.4,
            'vote_count': 26000,
            'release_date': '1999-10-15',
            'genre_ids': [18],
            'popularity': 61.4,
        }
        # 不传 media_type，从 raw 中读取
        result = TMDBClient.normalize_result(raw)
        assert result['mediaType'] == 'movie'
        assert result['title'] == 'Fight Club'

    def test_normalize_person_type_defaults_to_movie(self):
        """/search/multi 返回 person 类型时默认为 movie"""
        raw = {
            'id': 123,
            'media_type': 'person',
            'name': 'Brad Pitt',
            'popularity': 50.0,
        }
        result = TMDBClient.normalize_result(raw)
        assert result['mediaType'] == 'movie'

    def test_normalize_missing_fields(self):
        """缺失字段使用默认值"""
        raw = {'id': 1}
        result = TMDBClient.normalize_result(raw)

        assert result['tmdbId'] == 1
        assert result['title'] == ''
        assert result['originalTitle'] == ''
        assert result['posterPath'] is None
        assert result['backdropPath'] is None
        assert result['overview'] == ''
        assert result['voteAverage'] == 0.0
        assert result['voteCount'] == 0
        assert result['releaseDate'] is None
        assert result['genreIds'] == []
        assert result['popularity'] == 0.0

    def test_normalize_vote_average_is_float(self):
        """voteAverage 始终为 float"""
        raw = {'id': 1, 'vote_average': 8}
        result = TMDBClient.normalize_result(raw)
        assert isinstance(result['voteAverage'], float)
        assert result['voteAverage'] == 8.0

    def test_normalize_vote_count_is_int(self):
        """voteCount 始终为 int"""
        raw = {'id': 1, 'vote_count': 100.0}
        result = TMDBClient.normalize_result(raw)
        assert isinstance(result['voteCount'], int)

    def test_normalize_with_hot_score(self):
        """包含 hotScore 和 hotReasons 的结果"""
        raw = {
            'id': 550,
            'title': 'Fight Club',
            'vote_average': 8.4,
            'vote_count': 26000,
            'genre_ids': [18],
            'popularity': 61.4,
            'hot_score': 85,
            'hot_reasons': ['TMDB 周趋势 Top10', '近期上映'],
        }
        result = TMDBClient.normalize_result(raw, media_type='movie')
        assert result['hotScore'] == 85
        assert result['hotReasons'] == ['TMDB 周趋势 Top10', '近期上映']
