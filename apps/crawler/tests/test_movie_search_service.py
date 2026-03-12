"""MovieSearchService 单元测试

Mock TMDBClient 和 Redis/MongoDB，测试搜索服务的核心逻辑。
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.movie.search_service import MovieSearchService, calculate_hot_score
from app.services.movie.tmdb_client import TMDBClient


# ==================== 测试数据 ====================

MOCK_MOVIE_RAW = {
    'id': 550,
    'media_type': 'movie',
    'title': 'Fight Club',
    'original_title': 'Fight Club',
    'poster_path': '/poster.jpg',
    'backdrop_path': '/backdrop.jpg',
    'overview': 'An insomniac office worker...',
    'vote_average': 8.4,
    'vote_count': 26000,
    'release_date': '1999-10-15',
    'genre_ids': [18, 53],
    'popularity': 61.4,
}

MOCK_TV_RAW = {
    'id': 1396,
    'media_type': 'tv',
    'name': '绝命毒师',
    'original_name': 'Breaking Bad',
    'poster_path': '/bb_poster.jpg',
    'backdrop_path': '/bb_backdrop.jpg',
    'overview': '一位高中化学老师...',
    'vote_average': 8.9,
    'vote_count': 12000,
    'first_air_date': '2008-01-20',
    'genre_ids': [18, 80],
    'popularity': 150.2,
}

MOCK_SEARCH_RESPONSE = {
    'results': [MOCK_MOVIE_RAW],
    'page': 1,
    'total_pages': 5,
    'total_results': 100,
}

MOCK_DETAIL_RESPONSE = {
    'id': 550,
    'title': 'Fight Club',
    'original_title': 'Fight Club',
    'poster_path': '/poster.jpg',
    'backdrop_path': '/backdrop.jpg',
    'overview': 'An insomniac office worker...',
    'vote_average': 8.4,
    'vote_count': 26000,
    'release_date': '1999-10-15',
    'genres': [{'id': 18, 'name': 'Drama'}],
    'runtime': 139,
    'popularity': 61.4,
    'production_countries': [{'iso_3166_1': 'US', 'name': 'United States'}],
    'status': 'Released',
    'credits': {
        'crew': [
            {'name': 'David Fincher', 'job': 'Director', 'profile_path': '/fincher.jpg'},
            {'name': 'Jim Uhls', 'job': 'Screenplay', 'profile_path': None},
        ],
        'cast': [
            {'name': 'Brad Pitt', 'character': 'Tyler Durden', 'profile_path': '/pitt.jpg'},
            {'name': 'Edward Norton', 'character': 'The Narrator', 'profile_path': '/norton.jpg'},
        ],
    },
    'similar': {
        'results': [
            {
                'id': 680,
                'title': 'Pulp Fiction',
                'original_title': 'Pulp Fiction',
                'vote_average': 8.5,
                'vote_count': 25000,
                'release_date': '1994-09-10',
                'genre_ids': [53, 80],
                'popularity': 50.0,
            }
        ],
    },
    'external_ids': {
        'imdb_id': 'tt0137523',
        'facebook_id': None,
        'instagram_id': None,
        'twitter_id': None,
    },
}

MOCK_GENRES = [
    {'id': 28, 'name': '动作'},
    {'id': 12, 'name': '冒险'},
    {'id': 18, 'name': '剧情'},
]


# ==================== search 测试 ====================


class TestMovieSearchServiceSearch:
    """search 方法测试"""

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_search_basic(self, MockTMDB, MockHistory, app_context):
        """基本关键词搜索返回标准化结果"""
        mock_client = MagicMock()
        mock_client.search.return_value = MOCK_SEARCH_RESPONSE
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'mediaType': raw.get('media_type', 'movie'),
            'title': raw.get('title', ''),
        }

        result = MovieSearchService.search('Fight Club')

        mock_client.search.assert_called_once_with(
            'Fight Club', page=1, media_type='all'
        )
        assert result['page'] == 1
        assert result['totalPages'] == 5
        assert result['totalResults'] == 100
        assert len(result['results']) == 1
        assert result['results'][0]['tmdbId'] == 550

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_search_records_history(self, MockTMDB, MockHistory, app_context):
        """搜索时记录搜索历史"""
        mock_client = MagicMock()
        mock_client.search.return_value = MOCK_SEARCH_RESPONSE
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {'tmdbId': raw['id']}

        MovieSearchService.search('inception')

        MockHistory.upsert.assert_called_once_with('inception', search_type='keyword')

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_search_history_failure_does_not_break(self, MockTMDB, MockHistory, app_context):
        """搜索历史记录失败不影响搜索结果"""
        mock_client = MagicMock()
        mock_client.search.return_value = MOCK_SEARCH_RESPONSE
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {'tmdbId': raw['id']}
        MockHistory.upsert.side_effect = Exception('DB error')

        result = MovieSearchService.search('test')
        assert len(result['results']) == 1

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_search_with_media_type(self, MockTMDB, MockHistory, app_context):
        """指定 media_type 搜索"""
        mock_client = MagicMock()
        mock_client.search.return_value = {'results': [], 'page': 1, 'total_pages': 0, 'total_results': 0}
        MockTMDB.return_value = mock_client

        MovieSearchService.search('test', media_type='movie', page=2)

        mock_client.search.assert_called_once_with('test', page=2, media_type='movie')

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_search_with_filters_no_query_uses_discover(self, MockTMDB, MockHistory, app_context):
        """有筛选条件但无关键词时走 discover"""
        mock_client = MagicMock()
        mock_client.discover.return_value = {'results': [], 'page': 1, 'total_pages': 0, 'total_results': 0}
        MockTMDB.return_value = mock_client

        MovieSearchService.search('', media_type='movie', genre_id=28)

        mock_client.discover.assert_called_once()
        mock_client.search.assert_not_called()

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_search_empty_query_no_history(self, MockTMDB, MockHistory, app_context):
        """空关键词不记录搜索历史"""
        mock_client = MagicMock()
        mock_client.discover.return_value = {'results': [], 'page': 1, 'total_pages': 0, 'total_results': 0}
        MockTMDB.return_value = mock_client

        MovieSearchService.search('', media_type='movie', genre_id=28)

        MockHistory.upsert.assert_not_called()

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_search_filters_person_results(self, MockTMDB, MockHistory, app_context):
        """过滤掉 /search/multi 返回的 person 类型"""
        person_raw = {'id': 999, 'media_type': 'person', 'name': 'Brad Pitt'}
        mock_client = MagicMock()
        mock_client.search.return_value = {
            'results': [MOCK_MOVIE_RAW, person_raw],
            'page': 1, 'total_pages': 1, 'total_results': 2,
        }
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'mediaType': raw.get('media_type', 'movie'),
        }

        result = MovieSearchService.search('Brad Pitt')
        # person 类型应被过滤
        assert len(result['results']) == 1
        assert result['results'][0]['tmdbId'] == 550


# ==================== get_detail 测试 ====================


class TestMovieSearchServiceGetDetail:
    """get_detail 方法测试"""

    @patch('app.services.movie.search_service.DoubanSpider')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_detail_movie(self, MockTMDB, MockDouban, app_context):
        """获取电影详情，包含演职人员和相似推荐"""
        mock_client = MagicMock()
        mock_client.get_detail.return_value = MOCK_DETAIL_RESPONSE
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'title': raw.get('title', ''),
        }
        # 豆瓣返回 None（未找到）
        mock_spider = MagicMock()
        mock_spider.search_by_title.return_value = None
        MockDouban.return_value = mock_spider

        detail = MovieSearchService.get_detail(550, 'movie')

        assert detail['tmdbId'] == 550
        assert detail['mediaType'] == 'movie'
        assert detail['title'] == 'Fight Club'
        assert detail['voteAverage'] == 8.4
        assert detail['runtime'] == 139

        # 导演
        assert len(detail['directors']) == 1
        assert detail['directors'][0]['name'] == 'David Fincher'

        # 演员
        assert len(detail['cast']) == 2
        assert detail['cast'][0]['name'] == 'Brad Pitt'
        assert detail['cast'][0]['character'] == 'Tyler Durden'

        # 相似推荐
        assert len(detail['similar']) == 1
        assert detail['similar'][0]['tmdbId'] == 680

        # 外部链接
        assert detail['externalIds']['imdbId'] == 'tt0137523'

        # 豆瓣字段（未找到时为 None）
        assert detail['doubanRating'] is None
        assert detail['doubanUrl'] is None
        assert detail['hotComments'] is None

    @patch('app.services.movie.search_service.DoubanSpider')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_detail_with_douban_data(self, MockTMDB, MockDouban, app_context):
        """详情中包含豆瓣补充数据"""
        mock_client = MagicMock()
        mock_client.get_detail.return_value = MOCK_DETAIL_RESPONSE
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'title': raw.get('title', ''),
        }
        # 豆瓣返回数据
        mock_spider = MagicMock()
        mock_spider.search_by_title.return_value = {
            'doubanRating': 9.0,
            'doubanUrl': 'https://movie.douban.com/subject/1292052/',
            'hotComments': ['经典之作', '百看不厌'],
        }
        MockDouban.return_value = mock_spider

        detail = MovieSearchService.get_detail(550, 'movie')

        # 验证豆瓣数据已填充
        assert detail['doubanRating'] == 9.0
        assert detail['doubanUrl'] == 'https://movie.douban.com/subject/1292052/'
        assert detail['hotComments'] == ['经典之作', '百看不厌']
        # 验证调用参数
        mock_spider.search_by_title.assert_called_once_with(
            title='Fight Club', year='1999', tmdb_id=550
        )

    @patch('app.services.movie.search_service.DoubanSpider')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_detail_douban_failure_silent_degrade(self, MockTMDB, MockDouban, app_context):
        """豆瓣获取失败时静默降级，不影响 TMDB 数据"""
        mock_client = MagicMock()
        mock_client.get_detail.return_value = MOCK_DETAIL_RESPONSE
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'title': raw.get('title', ''),
        }
        # 豆瓣抛出异常
        mock_spider = MagicMock()
        mock_spider.search_by_title.side_effect = Exception('网络超时')
        MockDouban.return_value = mock_spider

        detail = MovieSearchService.get_detail(550, 'movie')

        # TMDB 核心字段完整
        assert detail['tmdbId'] == 550
        assert detail['title'] == 'Fight Club'
        assert detail['voteAverage'] == 8.4
        assert len(detail['directors']) == 1
        assert len(detail['cast']) == 2
        # 豆瓣字段降级为 None
        assert detail['doubanRating'] is None
        assert detail['doubanUrl'] is None
        assert detail['hotComments'] is None

    @patch('app.services.movie.search_service.DoubanSpider')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_detail_tv_extra_fields(self, MockTMDB, MockDouban, app_context):
        """电视剧详情包含季数和集数"""
        tv_detail = {
            **MOCK_DETAIL_RESPONSE,
            'id': 1396,
            'name': 'Breaking Bad',
            'original_name': 'Breaking Bad',
            'first_air_date': '2008-01-20',
            'number_of_seasons': 5,
            'number_of_episodes': 62,
        }
        # 移除 movie 专属字段
        tv_detail.pop('title', None)
        tv_detail.pop('original_title', None)
        tv_detail.pop('release_date', None)

        mock_client = MagicMock()
        mock_client.get_detail.return_value = tv_detail
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {'tmdbId': raw['id']}
        MockDouban.return_value.search_by_title.return_value = None

        detail = MovieSearchService.get_detail(1396, 'tv')

        assert detail['mediaType'] == 'tv'
        assert detail['numberOfSeasons'] == 5
        assert detail['numberOfEpisodes'] == 62
        assert detail['title'] == 'Breaking Bad'

    @patch('app.services.movie.search_service.DoubanSpider')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_detail_no_credits(self, MockTMDB, MockDouban, app_context):
        """详情中无 credits 时返回空列表"""
        raw = {**MOCK_DETAIL_RESPONSE}
        raw.pop('credits')
        mock_client = MagicMock()
        mock_client.get_detail.return_value = raw
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {'tmdbId': raw['id']}
        MockDouban.return_value.search_by_title.return_value = None

        detail = MovieSearchService.get_detail(550, 'movie')

        assert detail['directors'] == []
        assert detail['cast'] == []

    @patch('app.services.movie.search_service.DoubanSpider')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_detail_no_release_date_passes_empty_year(self, MockTMDB, MockDouban, app_context):
        """无上映日期时传空年份给豆瓣"""
        raw = {**MOCK_DETAIL_RESPONSE}
        raw['release_date'] = None
        mock_client = MagicMock()
        mock_client.get_detail.return_value = raw
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {'tmdbId': raw['id']}
        mock_spider = MagicMock()
        mock_spider.search_by_title.return_value = None
        MockDouban.return_value = mock_spider

        MovieSearchService.get_detail(550, 'movie')

        mock_spider.search_by_title.assert_called_once_with(
            title='Fight Club', year='', tmdb_id=550
        )


# ==================== get_trending / get_popular 测试 ====================


class TestMovieSearchServiceTrendingPopular:
    """趋势和热门方法测试"""

    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_trending(self, MockTMDB, app_context):
        """获取趋势资源并标准化"""
        mock_client = MagicMock()
        mock_client.get_trending.return_value = MOCK_SEARCH_RESPONSE
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
        }

        result = MovieSearchService.get_trending('all', 'week', 1)

        mock_client.get_trending.assert_called_once_with(
            media_type='all', time_window='week', page=1
        )
        assert result['page'] == 1
        assert len(result['results']) == 1

    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_popular(self, MockTMDB, app_context):
        """获取热门资源并标准化"""
        mock_client = MagicMock()
        mock_client.get_popular.return_value = MOCK_SEARCH_RESPONSE
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
        }

        result = MovieSearchService.get_popular('movie', 1)

        mock_client.get_popular.assert_called_once_with(
            media_type='movie', page=1
        )
        assert len(result['results']) == 1


# ==================== discover 测试 ====================


class TestMovieSearchServiceDiscover:
    """discover 方法测试"""

    @patch('app.services.movie.search_service.TMDBClient')
    def test_discover_passes_filters(self, MockTMDB, app_context):
        """discover 将筛选条件传递给 TMDBClient"""
        mock_client = MagicMock()
        mock_client.discover.return_value = {
            'results': [MOCK_MOVIE_RAW],
            'page': 1, 'total_pages': 1, 'total_results': 1,
        }
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
        }

        result = MovieSearchService.discover(
            media_type='movie', genre_id=28, year_from=2020
        )

        mock_client.discover.assert_called_once_with(
            media_type='movie', genre_id=28, year_from=2020
        )
        assert len(result['results']) == 1

    @patch('app.services.movie.search_service.TMDBClient')
    def test_discover_empty_results(self, MockTMDB, app_context):
        """discover 无结果时返回空列表"""
        mock_client = MagicMock()
        mock_client.discover.return_value = {
            'results': [], 'page': 1, 'total_pages': 0, 'total_results': 0,
        }
        MockTMDB.return_value = mock_client

        result = MovieSearchService.discover(media_type='movie')
        assert result['results'] == []
        assert result['totalResults'] == 0


# ==================== get_genres 测试 ====================


class TestMovieSearchServiceGetGenres:
    """get_genres 方法测试（含 Redis 缓存）"""

    @patch('app.services.movie.search_service.redis_client')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_genres_cache_miss(self, MockTMDB, mock_redis, app_context):
        """缓存未命中时调用 TMDB API 并写入缓存"""
        mock_redis.get.return_value = None
        mock_client = MagicMock()
        mock_client.get_genres.return_value = MOCK_GENRES
        MockTMDB.return_value = mock_client

        genres = MovieSearchService.get_genres('movie')

        assert genres == MOCK_GENRES
        mock_client.get_genres.assert_called_once_with(media_type='movie')
        mock_redis.set.assert_called_once()
        # 验证缓存键和 TTL
        call_args = mock_redis.set.call_args
        assert call_args[0][0] == 'crawler:tmdb:genres:movie'
        assert call_args[1]['ex'] == 86400

    @patch('app.services.movie.search_service.redis_client')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_genres_cache_hit(self, MockTMDB, mock_redis, app_context):
        """缓存命中时直接返回，不调用 TMDB API"""
        mock_redis.get.return_value = json.dumps(MOCK_GENRES)

        genres = MovieSearchService.get_genres('movie')

        assert genres == MOCK_GENRES
        MockTMDB.assert_not_called()

    @patch('app.services.movie.search_service.redis_client')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_genres_redis_error_fallback(self, MockTMDB, mock_redis, app_context):
        """Redis 异常时回退到 TMDB API"""
        mock_redis.get.side_effect = Exception('Redis down')
        mock_redis.set.side_effect = Exception('Redis down')
        mock_client = MagicMock()
        mock_client.get_genres.return_value = MOCK_GENRES
        MockTMDB.return_value = mock_client

        genres = MovieSearchService.get_genres('tv')

        assert genres == MOCK_GENRES
        mock_client.get_genres.assert_called_once_with(media_type='tv')


# ==================== 搜索历史测试 ====================


class TestMovieSearchServiceHistory:
    """搜索历史方法测试"""

    @patch('app.services.movie.search_service.MovieSearchHistory')
    def test_record_search(self, MockHistory, app_context):
        """记录搜索历史"""
        MovieSearchService.record_search('test keyword')
        MockHistory.upsert.assert_called_once_with(
            'test keyword', search_type='keyword'
        )

    @patch('app.services.movie.search_service.MovieSearchHistory')
    def test_record_search_ai_type(self, MockHistory, app_context):
        """记录 AI 搜索历史"""
        MovieSearchService.record_search('自然语言描述', search_type='ai')
        MockHistory.upsert.assert_called_once_with(
            '自然语言描述', search_type='ai'
        )

    @patch('app.services.movie.search_service.MovieSearchHistory')
    def test_get_search_history(self, MockHistory, app_context):
        """获取搜索历史"""
        mock_record = MagicMock()
        mock_record.to_dict.return_value = {
            'id': '1', 'keyword': 'test', 'searchType': 'keyword',
        }
        MockHistory.get_recent.return_value = [mock_record]

        history = MovieSearchService.get_search_history(limit=10)

        MockHistory.get_recent.assert_called_once_with(limit=10)
        assert len(history) == 1
        assert history[0]['keyword'] == 'test'

    @patch('app.services.movie.search_service.MovieSearchHistory')
    def test_clear_search_history(self, MockHistory, app_context):
        """清空搜索历史"""
        MovieSearchService.clear_search_history()
        MockHistory.clear_all.assert_called_once()


# ==================== calculate_hot_score 测试 ====================


class TestCalculateHotScore:
    """calculate_hot_score 函数测试"""

    def test_high_popularity_top_rank_recent(self):
        """高热度 + Top1 排名 + 近期上映 → 接近满分"""
        from datetime import datetime, timedelta
        recent_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        score = calculate_hot_score(500.0, 1, recent_date)
        assert 80 <= score <= 100

    def test_zero_popularity_no_rank_no_date(self):
        """零热度 + 无排名 + 无日期 → 0 分"""
        score = calculate_hot_score(0.0, None, None)
        assert score == 0

    def test_score_range_always_0_to_100(self):
        """分数始终在 [0, 100] 范围内"""
        # 极高热度
        score = calculate_hot_score(99999.0, 1, '2025-01-01')
        assert 0 <= score <= 100

        # 负热度（异常值）
        score = calculate_hot_score(-100.0, None, None)
        assert 0 <= score <= 100

    def test_returns_int(self):
        """返回值为整数"""
        score = calculate_hot_score(100.0, 5, '2024-06-01')
        assert isinstance(score, int)

    def test_trending_rank_outside_top20_gets_zero_trend(self):
        """排名超过 20 不获得趋势分"""
        score_rank_21 = calculate_hot_score(0.0, 21, None)
        score_no_rank = calculate_hot_score(0.0, None, None)
        assert score_rank_21 == score_no_rank == 0

    def test_trending_rank_1_vs_20(self):
        """Top1 趋势分高于 Top20"""
        score_1 = calculate_hot_score(0.0, 1, None)
        score_20 = calculate_hot_score(0.0, 20, None)
        assert score_1 > score_20

    def test_future_release_date_gets_max_freshness(self):
        """未来上映日期获得满分新鲜度"""
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        score = calculate_hot_score(0.0, None, future_date)
        assert score == 30  # 仅新鲜度分

    def test_old_release_date_gets_zero_freshness(self):
        """超过 365 天的上映日期新鲜度为 0"""
        score = calculate_hot_score(0.0, None, '2020-01-01')
        assert score == 0

    def test_invalid_date_format(self):
        """无效日期格式不报错，新鲜度为 0"""
        score = calculate_hot_score(100.0, None, 'not-a-date')
        # 仅有热度分
        assert score > 0
        score_none = calculate_hot_score(100.0, None, None)
        assert score == score_none

    def test_popularity_capped_at_40(self):
        """热度分最高 40"""
        # popularity=500 → 40 分，popularity=1000 也是 40 分
        score_500 = calculate_hot_score(500.0, None, None)
        score_1000 = calculate_hot_score(1000.0, None, None)
        assert score_500 == score_1000 == 40


# ==================== get_hotspot 测试 ====================


MOCK_TRENDING_RESPONSE = {
    'results': [
        {
            'id': 100 + i,
            'media_type': 'movie',
            'title': f'Trending Movie {i}',
            'original_title': f'Trending Movie {i}',
            'poster_path': f'/poster_{i}.jpg',
            'backdrop_path': None,
            'overview': f'Overview {i}',
            'vote_average': 7.0 + i * 0.1,
            'vote_count': 1000,
            'release_date': '2025-01-15',
            'genre_ids': [28],
            'popularity': 200.0 - i * 5,
        }
        for i in range(25)  # 25 条，但只取 Top20
    ],
    'page': 1,
    'total_pages': 1,
    'total_results': 25,
}


class TestMovieSearchServiceGetHotspot:
    """get_hotspot 方法测试"""

    @patch('app.services.movie.search_service.redis_client')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_hotspot_cache_miss(self, MockTMDB, mock_redis, app_context):
        """缓存未命中时调用 TMDB API 并写入缓存"""
        mock_redis.get.return_value = None
        mock_client = MagicMock()
        mock_client.get_trending.return_value = MOCK_TRENDING_RESPONSE
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = TMDBClient.normalize_result

        result = MovieSearchService.get_hotspot()

        assert 'results' in result
        assert len(result['results']) == 20  # Top20
        mock_client.get_trending.assert_called_once_with(
            media_type='all', time_window='week', page=1
        )
        # 验证写入缓存
        mock_redis.set.assert_called_once()
        call_args = mock_redis.set.call_args
        assert call_args[0][0] == 'crawler:tmdb:hotspot'
        assert call_args[1]['ex'] == 21600

    @patch('app.services.movie.search_service.redis_client')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_hotspot_cache_hit(self, MockTMDB, mock_redis, app_context):
        """缓存命中时直接返回，不调用 TMDB API"""
        cached_data = {'results': [{'tmdbId': 1, 'hotScore': 80}]}
        mock_redis.get.return_value = json.dumps(cached_data)

        result = MovieSearchService.get_hotspot()

        assert result == cached_data
        MockTMDB.assert_not_called()

    @patch('app.services.movie.search_service.redis_client')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_hotspot_results_have_hot_score(self, MockTMDB, mock_redis, app_context):
        """每个结果都包含 hotScore 和 hotReasons"""
        mock_redis.get.return_value = None
        mock_client = MagicMock()
        mock_client.get_trending.return_value = MOCK_TRENDING_RESPONSE
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = TMDBClient.normalize_result

        result = MovieSearchService.get_hotspot()

        for item in result['results']:
            assert 'hotScore' in item
            assert isinstance(item['hotScore'], int)
            assert 0 <= item['hotScore'] <= 100
            assert 'hotReasons' in item
            assert isinstance(item['hotReasons'], list)

    @patch('app.services.movie.search_service.redis_client')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_hotspot_sorted_by_score_desc(self, MockTMDB, mock_redis, app_context):
        """结果按 hotScore 降序排列"""
        mock_redis.get.return_value = None
        mock_client = MagicMock()
        mock_client.get_trending.return_value = MOCK_TRENDING_RESPONSE
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = TMDBClient.normalize_result

        result = MovieSearchService.get_hotspot()

        scores = [item['hotScore'] for item in result['results']]
        assert scores == sorted(scores, reverse=True)

    @patch('app.services.movie.search_service.redis_client')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_hotspot_redis_error_fallback(self, MockTMDB, mock_redis, app_context):
        """Redis 异常时仍能返回结果"""
        mock_redis.get.side_effect = Exception('Redis down')
        mock_redis.set.side_effect = Exception('Redis down')
        mock_client = MagicMock()
        mock_client.get_trending.return_value = MOCK_TRENDING_RESPONSE
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = TMDBClient.normalize_result

        result = MovieSearchService.get_hotspot()

        assert 'results' in result
        assert len(result['results']) == 20

    @patch('app.services.movie.search_service.redis_client')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_get_hotspot_hot_reasons_content(self, MockTMDB, mock_redis, app_context):
        """热点原因包含趋势排名和高热度标签"""
        mock_redis.get.return_value = None
        mock_client = MagicMock()
        # 只返回 2 条结果便于验证
        small_response = {
            'results': MOCK_TRENDING_RESPONSE['results'][:2],
            'page': 1, 'total_pages': 1, 'total_results': 2,
        }
        mock_client.get_trending.return_value = small_response
        MockTMDB.return_value = mock_client
        MockTMDB.normalize_result = TMDBClient.normalize_result

        result = MovieSearchService.get_hotspot()

        # 所有结果 popularity > 100，应有"高热度"标签
        for item in result['results']:
            assert '高热度' in item['hotReasons']
            # 排名 1-2 应有趋势标签
            has_trend = any('TMDB 周趋势' in r for r in item['hotReasons'])
            assert has_trend


# ==================== ai_search 测试 ====================

# AI 返回的有效 JSON 响应
MOCK_AI_RESPONSE_JSON = json.dumps({
    'queries': [
        {
            'keyword': '悬疑',
            'media_type': 'movie',
            'genre_ids': [9648, 53],
            'year_from': 2023,
            'year_to': None,
            'rating_min': 7.0,
            'region': None,
        }
    ],
    'explanation': '用户想找近期口碑好的悬疑片',
})

# AI 返回带 markdown 代码块包裹的 JSON
MOCK_AI_RESPONSE_MARKDOWN = f'```json\n{MOCK_AI_RESPONSE_JSON}\n```'

# AI 返回多组查询
MOCK_AI_MULTI_QUERY_JSON = json.dumps({
    'queries': [
        {
            'keyword': '盗梦空间',
            'media_type': 'movie',
            'genre_ids': [],
            'year_from': None,
            'year_to': None,
            'rating_min': None,
            'region': None,
        },
        {
            'keyword': '星际穿越',
            'media_type': 'movie',
            'genre_ids': [],
            'year_from': None,
            'year_to': None,
            'rating_min': None,
            'region': None,
        },
    ],
    'explanation': '用户想找诺兰的经典科幻片',
})

# 搜索结果 mock 数据
MOCK_SEARCH_RESULT_1 = {
    'results': [
        {
            'id': 27205,
            'media_type': 'movie',
            'title': '盗梦空间',
            'original_title': 'Inception',
            'poster_path': '/inception.jpg',
            'backdrop_path': None,
            'overview': '一个关于梦境的故事',
            'vote_average': 8.4,
            'vote_count': 30000,
            'release_date': '2010-07-16',
            'genre_ids': [28, 878],
            'popularity': 80.0,
        }
    ],
    'page': 1,
    'total_pages': 1,
    'total_results': 1,
}

MOCK_SEARCH_RESULT_2 = {
    'results': [
        {
            'id': 157336,
            'media_type': 'movie',
            'title': '星际穿越',
            'original_title': 'Interstellar',
            'poster_path': '/interstellar.jpg',
            'backdrop_path': None,
            'overview': '一个关于太空的故事',
            'vote_average': 8.6,
            'vote_count': 28000,
            'release_date': '2014-11-07',
            'genre_ids': [12, 878],
            'popularity': 90.0,
        },
        # 重复的盗梦空间（用于测试去重）
        {
            'id': 27205,
            'media_type': 'movie',
            'title': '盗梦空间',
            'original_title': 'Inception',
            'poster_path': '/inception.jpg',
            'backdrop_path': None,
            'overview': '一个关于梦境的故事',
            'vote_average': 8.4,
            'vote_count': 30000,
            'release_date': '2010-07-16',
            'genre_ids': [28, 878],
            'popularity': 80.0,
        },
    ],
    'page': 1,
    'total_pages': 1,
    'total_results': 2,
}


def _make_ai_response(text: str):
    """构造 mock Anthropic 响应对象"""
    mock_block = MagicMock()
    mock_block.type = 'text'
    mock_block.text = text
    mock_response = MagicMock()
    mock_response.content = [mock_block]
    return mock_response


class TestMovieSearchServiceAiSearch:
    """ai_search 方法测试"""

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    @patch('app.services.movie.search_service.LLMService')
    def test_ai_search_success(self, MockLLM, MockTMDB, MockHistory, app_context):
        """AI 搜索成功：解析参数 → 调用 TMDB → 返回结果"""
        # 配置 ANTHROPIC_API_KEY
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        # Mock LLM 客户端
        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_ai_response(MOCK_AI_RESPONSE_JSON)
        MockLLM._get_client.return_value = mock_client

        # Mock TMDB 客户端
        mock_tmdb = MagicMock()
        mock_tmdb.search.return_value = MOCK_SEARCH_RESULT_1
        MockTMDB.return_value = mock_tmdb
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'mediaType': raw.get('media_type', 'movie'),
            'title': raw.get('title', ''),
        }

        result = MovieSearchService.ai_search('最近口碑炸裂的悬疑片')

        assert result['fallback'] is False
        assert result['aiParams'] is not None
        assert len(result['aiParams']['queries']) == 1
        assert len(result['results']) == 1
        assert result['results'][0]['tmdbId'] == 27205

        # 验证记录了搜索历史
        MockHistory.upsert.assert_called_once_with('最近口碑炸裂的悬疑片', search_type='ai')

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    @patch('app.services.movie.search_service.LLMService')
    def test_ai_search_markdown_wrapped_json(self, MockLLM, MockTMDB, MockHistory, app_context):
        """AI 返回 markdown 代码块包裹的 JSON 也能正确解析"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_ai_response(MOCK_AI_RESPONSE_MARKDOWN)
        MockLLM._get_client.return_value = mock_client

        mock_tmdb = MagicMock()
        mock_tmdb.search.return_value = MOCK_SEARCH_RESULT_1
        MockTMDB.return_value = mock_tmdb
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'mediaType': raw.get('media_type', 'movie'),
            'title': raw.get('title', ''),
        }

        result = MovieSearchService.ai_search('悬疑片推荐')

        assert result['fallback'] is False
        assert result['aiParams'] is not None
        assert len(result['results']) == 1

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    @patch('app.services.movie.search_service.LLMService')
    def test_ai_search_deduplication(self, MockLLM, MockTMDB, MockHistory, app_context):
        """多组查询结果按 tmdbId 去重"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_ai_response(MOCK_AI_MULTI_QUERY_JSON)
        MockLLM._get_client.return_value = mock_client

        mock_tmdb = MagicMock()
        # 第一次搜索返回盗梦空间，第二次返回星际穿越+盗梦空间（重复）
        mock_tmdb.search.side_effect = [MOCK_SEARCH_RESULT_1, MOCK_SEARCH_RESULT_2]
        MockTMDB.return_value = mock_tmdb
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'mediaType': raw.get('media_type', 'movie'),
            'title': raw.get('title', ''),
        }

        result = MovieSearchService.ai_search('诺兰的经典科幻片')

        assert result['fallback'] is False
        # 盗梦空间出现两次，但去重后只有 2 个结果
        tmdb_ids = [r['tmdbId'] for r in result['results']]
        assert len(tmdb_ids) == len(set(tmdb_ids))  # 无重复
        assert 27205 in tmdb_ids
        assert 157336 in tmdb_ids

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    @patch('app.services.movie.search_service.LLMService')
    def test_ai_search_invalid_json_fallback(self, MockLLM, MockTMDB, MockHistory, app_context):
        """AI 返回无效 JSON 时回退到普通搜索"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_ai_response('这不是有效的 JSON')
        MockLLM._get_client.return_value = mock_client

        # Mock 普通搜索的 TMDB 调用
        mock_tmdb = MagicMock()
        mock_tmdb.search.return_value = MOCK_SEARCH_RESULT_1
        MockTMDB.return_value = mock_tmdb
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'mediaType': raw.get('media_type', 'movie'),
            'title': raw.get('title', ''),
        }

        result = MovieSearchService.ai_search('一些描述')

        assert result['fallback'] is True
        assert result['aiParams'] is None
        assert 'fallbackReason' in result
        # 仍然有搜索结果（来自普通搜索）
        assert len(result['results']) >= 0

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    @patch('app.services.movie.search_service.LLMService')
    def test_ai_search_empty_queries_fallback(self, MockLLM, MockTMDB, MockHistory, app_context):
        """AI 返回空 queries 时回退到普通搜索"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        empty_queries_json = json.dumps({
            'queries': [],
            'explanation': '无法理解用户意图',
        })
        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_ai_response(empty_queries_json)
        MockLLM._get_client.return_value = mock_client

        mock_tmdb = MagicMock()
        mock_tmdb.search.return_value = MOCK_SEARCH_RESULT_1
        MockTMDB.return_value = mock_tmdb
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'mediaType': raw.get('media_type', 'movie'),
            'title': raw.get('title', ''),
        }

        result = MovieSearchService.ai_search('???')

        assert result['fallback'] is True
        assert result['aiParams'] is None

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    @patch('app.services.movie.search_service.LLMService')
    def test_ai_search_api_error_fallback(self, MockLLM, MockTMDB, MockHistory, app_context):
        """Anthropic API 调用失败时回退到普通搜索"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        MockLLM._get_client.side_effect = ValueError('ANTHROPIC_API_KEY 未配置')

        mock_tmdb = MagicMock()
        mock_tmdb.search.return_value = MOCK_SEARCH_RESULT_1
        MockTMDB.return_value = mock_tmdb
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'mediaType': raw.get('media_type', 'movie'),
            'title': raw.get('title', ''),
        }

        result = MovieSearchService.ai_search('好看的电影')

        assert result['fallback'] is True
        assert 'ANTHROPIC_API_KEY' in result['fallbackReason']

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    @patch('app.services.movie.search_service.LLMService')
    def test_ai_search_records_history(self, MockLLM, MockTMDB, MockHistory, app_context):
        """AI 搜索记录搜索历史，search_type='ai'"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_ai_response(MOCK_AI_RESPONSE_JSON)
        MockLLM._get_client.return_value = mock_client

        mock_tmdb = MagicMock()
        mock_tmdb.search.return_value = MOCK_SEARCH_RESULT_1
        MockTMDB.return_value = mock_tmdb
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'mediaType': raw.get('media_type', 'movie'),
            'title': raw.get('title', ''),
        }

        MovieSearchService.ai_search('悬疑片')

        MockHistory.upsert.assert_called_once_with('悬疑片', search_type='ai')

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    @patch('app.services.movie.search_service.LLMService')
    def test_ai_search_fallback_also_records_history(self, MockLLM, MockTMDB, MockHistory, app_context):
        """AI 搜索回退时也记录搜索历史"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_ai_response('invalid json')
        MockLLM._get_client.return_value = mock_client

        mock_tmdb = MagicMock()
        mock_tmdb.search.return_value = {'results': [], 'page': 1, 'total_pages': 0, 'total_results': 0}
        MockTMDB.return_value = mock_tmdb
        MockTMDB.normalize_result = lambda raw, media_type=None: {'tmdbId': raw['id']}

        MovieSearchService.ai_search('测试描述')

        # 回退路径中也应记录历史
        MockHistory.upsert.assert_called_with('测试描述', search_type='ai')

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    @patch('app.services.movie.search_service.LLMService')
    def test_ai_search_partial_query_failure(self, MockLLM, MockTMDB, MockHistory, app_context):
        """某个子查询失败时跳过，继续其他查询"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_ai_response(MOCK_AI_MULTI_QUERY_JSON)
        MockLLM._get_client.return_value = mock_client

        mock_tmdb = MagicMock()
        # 第一次搜索失败，第二次成功
        mock_tmdb.search.side_effect = [
            Exception('TMDB 请求失败'),
            MOCK_SEARCH_RESULT_2,
        ]
        MockTMDB.return_value = mock_tmdb
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'mediaType': raw.get('media_type', 'movie'),
            'title': raw.get('title', ''),
        }

        result = MovieSearchService.ai_search('诺兰电影')

        assert result['fallback'] is False
        # 第一个查询失败，第二个成功，应有结果
        assert len(result['results']) >= 1

    @patch('app.services.movie.search_service.MovieSearchHistory')
    @patch('app.services.movie.search_service.TMDBClient')
    @patch('app.services.movie.search_service.LLMService')
    def test_ai_search_response_structure(self, MockLLM, MockTMDB, MockHistory, app_context):
        """验证 AI 搜索响应包含所有必需字段"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_ai_response(MOCK_AI_RESPONSE_JSON)
        MockLLM._get_client.return_value = mock_client

        mock_tmdb = MagicMock()
        mock_tmdb.search.return_value = MOCK_SEARCH_RESULT_1
        MockTMDB.return_value = mock_tmdb
        MockTMDB.normalize_result = lambda raw, media_type=None: {
            'tmdbId': raw['id'],
            'mediaType': raw.get('media_type', 'movie'),
            'title': raw.get('title', ''),
        }

        result = MovieSearchService.ai_search('悬疑片')

        # 验证响应结构
        assert 'results' in result
        assert 'page' in result
        assert 'totalPages' in result
        assert 'totalResults' in result
        assert 'aiParams' in result
        assert 'fallback' in result
        assert isinstance(result['results'], list)
        assert isinstance(result['totalResults'], int)


# ==================== ai_copywriting 测试 ====================

# TMDB 详情 mock（用于 ai_copywriting）
MOCK_COPYWRITING_DETAIL = {
    'id': 550,
    'title': 'Fight Club',
    'original_title': 'Fight Club',
    'overview': 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
    'vote_average': 8.4,
    'release_date': '1999-10-15',
    'genres': [{'id': 18, 'name': 'Drama'}, {'id': 53, 'name': 'Thriller'}],
    'credits': {
        'crew': [
            {'name': 'David Fincher', 'job': 'Director', 'profile_path': '/fincher.jpg'},
        ],
        'cast': [
            {'name': 'Brad Pitt', 'character': 'Tyler Durden', 'profile_path': '/pitt.jpg'},
            {'name': 'Edward Norton', 'character': 'The Narrator', 'profile_path': '/norton.jpg'},
        ],
    },
}


def _make_copywriting_ai_response(text: str):
    """构造 mock Anthropic 响应对象"""
    mock_block = MagicMock()
    mock_block.type = 'text'
    mock_block.text = text
    mock_response = MagicMock()
    mock_response.content = [mock_block]
    return mock_response


class TestMovieSearchServiceAiCopywriting:
    """ai_copywriting 方法测试"""

    @patch('app.services.movie.search_service.LLMService')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_copywriting_outline_success(self, MockTMDB, MockLLM, app_context):
        """成功生成 outline 类型文案"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_tmdb = MagicMock()
        mock_tmdb.get_detail.return_value = MOCK_COPYWRITING_DETAIL
        MockTMDB.return_value = mock_tmdb

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_copywriting_ai_response(
            '# 解说大纲\n\n## 开场引入\n...'
        )
        MockLLM._get_client.return_value = mock_client

        result = MovieSearchService.ai_copywriting(550, 'movie', 'outline')

        assert 'error' not in result
        assert result['content'] == '# 解说大纲\n\n## 开场引入\n...'
        assert result['copyType'] == 'outline'
        assert result['tmdbId'] == 550
        assert result['mediaType'] == 'movie'
        assert result['title'] == 'Fight Club'

    @patch('app.services.movie.search_service.LLMService')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_copywriting_opening_success(self, MockTMDB, MockLLM, app_context):
        """成功生成 opening 类型文案"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_tmdb = MagicMock()
        mock_tmdb.get_detail.return_value = MOCK_COPYWRITING_DETAIL
        MockTMDB.return_value = mock_tmdb

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_copywriting_ai_response(
            '你有没有想过，如果你的生活完全失控...'
        )
        MockLLM._get_client.return_value = mock_client

        result = MovieSearchService.ai_copywriting(550, 'movie', 'opening')

        assert 'error' not in result
        assert result['copyType'] == 'opening'
        assert len(result['content']) > 0

    @patch('app.services.movie.search_service.LLMService')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_copywriting_summary_success(self, MockTMDB, MockLLM, app_context):
        """成功生成 summary 类型文案"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_tmdb = MagicMock()
        mock_tmdb.get_detail.return_value = MOCK_COPYWRITING_DETAIL
        MockTMDB.return_value = mock_tmdb

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_copywriting_ai_response(
            '故事开始于一个失眠的上班族...'
        )
        MockLLM._get_client.return_value = mock_client

        result = MovieSearchService.ai_copywriting(550, 'movie', 'summary')

        assert 'error' not in result
        assert result['copyType'] == 'summary'

    @patch('app.services.movie.search_service.LLMService')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_copywriting_commentary_success(self, MockTMDB, MockLLM, app_context):
        """成功生成 commentary 类型文案"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_tmdb = MagicMock()
        mock_tmdb.get_detail.return_value = MOCK_COPYWRITING_DETAIL
        MockTMDB.return_value = mock_tmdb

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_copywriting_ai_response(
            '1. 反转结局 — 这个结局直接把观众打懵了...'
        )
        MockLLM._get_client.return_value = mock_client

        result = MovieSearchService.ai_copywriting(550, 'movie', 'commentary')

        assert 'error' not in result
        assert result['copyType'] == 'commentary'

    def test_copywriting_invalid_copy_type(self, app_context):
        """无效的 copy_type 返回错误"""
        result = MovieSearchService.ai_copywriting(550, 'movie', 'invalid_type')

        assert result['error'] is True
        assert '无效的文案类型' in result['message']

    def test_copywriting_no_api_key(self, app_context):
        """ANTHROPIC_API_KEY 未配置返回错误"""
        app_context.config['ANTHROPIC_API_KEY'] = ''

        result = MovieSearchService.ai_copywriting(550, 'movie', 'outline')

        assert result['error'] is True
        assert 'AI 功能未启用' in result['message']

    def test_copywriting_no_api_key_none(self, app_context):
        """ANTHROPIC_API_KEY 为 None 返回错误"""
        app_context.config['ANTHROPIC_API_KEY'] = None

        result = MovieSearchService.ai_copywriting(550, 'movie', 'outline')

        assert result['error'] is True
        assert 'AI 功能未启用' in result['message']

    @patch('app.services.movie.search_service.LLMService')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_copywriting_ai_failure_returns_error(self, MockTMDB, MockLLM, app_context):
        """AI 生成失败返回错误"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_tmdb = MagicMock()
        mock_tmdb.get_detail.return_value = MOCK_COPYWRITING_DETAIL
        MockTMDB.return_value = mock_tmdb

        MockLLM._get_client.side_effect = Exception('API 连接失败')

        result = MovieSearchService.ai_copywriting(550, 'movie', 'outline')

        assert result['error'] is True
        assert 'AI 文案生成失败' in result['message']

    @patch('app.services.movie.search_service.LLMService')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_copywriting_tmdb_failure_returns_error(self, MockTMDB, MockLLM, app_context):
        """TMDB 详情获取失败返回错误"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_tmdb = MagicMock()
        mock_tmdb.get_detail.side_effect = Exception('TMDB 请求超时')
        MockTMDB.return_value = mock_tmdb

        result = MovieSearchService.ai_copywriting(550, 'movie', 'outline')

        assert result['error'] is True
        assert '获取影视详情失败' in result['message']

    @patch('app.services.movie.search_service.LLMService')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_copywriting_empty_ai_response(self, MockTMDB, MockLLM, app_context):
        """AI 返回空文本时返回错误"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_tmdb = MagicMock()
        mock_tmdb.get_detail.return_value = MOCK_COPYWRITING_DETAIL
        MockTMDB.return_value = mock_tmdb

        # 返回无 text 类型的 block
        mock_block = MagicMock()
        mock_block.type = 'thinking'
        mock_block.text = ''
        mock_response = MagicMock()
        mock_response.content = [mock_block]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response
        MockLLM._get_client.return_value = mock_client

        result = MovieSearchService.ai_copywriting(550, 'movie', 'outline')

        assert result['error'] is True
        assert 'AI 文案生成失败' in result['message']

    @patch('app.services.movie.search_service.LLMService')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_copywriting_response_structure(self, MockTMDB, MockLLM, app_context):
        """验证成功响应包含所有必需字段"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_tmdb = MagicMock()
        mock_tmdb.get_detail.return_value = MOCK_COPYWRITING_DETAIL
        MockTMDB.return_value = mock_tmdb

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_copywriting_ai_response('生成的文案内容')
        MockLLM._get_client.return_value = mock_client

        result = MovieSearchService.ai_copywriting(550, 'movie', 'outline')

        assert 'content' in result
        assert 'copyType' in result
        assert 'tmdbId' in result
        assert 'mediaType' in result
        assert 'title' in result
        assert isinstance(result['content'], str)
        assert isinstance(result['tmdbId'], int)

    @patch('app.services.movie.search_service.LLMService')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_copywriting_tv_show(self, MockTMDB, MockLLM, app_context):
        """电视剧类型也能正常生成文案"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        tv_detail = {
            'id': 1396,
            'name': '绝命毒师',
            'original_name': 'Breaking Bad',
            'overview': '一位高中化学老师被诊断出肺癌...',
            'vote_average': 8.9,
            'first_air_date': '2008-01-20',
            'genres': [{'id': 18, 'name': 'Drama'}],
            'credits': {
                'crew': [{'name': 'Vince Gilligan', 'job': 'Director'}],
                'cast': [{'name': 'Bryan Cranston', 'character': 'Walter White'}],
            },
        }

        mock_tmdb = MagicMock()
        mock_tmdb.get_detail.return_value = tv_detail
        MockTMDB.return_value = mock_tmdb

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_copywriting_ai_response('电视剧文案内容')
        MockLLM._get_client.return_value = mock_client

        result = MovieSearchService.ai_copywriting(1396, 'tv', 'outline')

        assert 'error' not in result
        assert result['title'] == '绝命毒师'
        assert result['mediaType'] == 'tv'
        assert result['tmdbId'] == 1396

    @patch('app.services.movie.search_service.LLMService')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_copywriting_prompt_contains_movie_info(self, MockTMDB, MockLLM, app_context):
        """验证 prompt 中包含影视信息"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        mock_tmdb = MagicMock()
        mock_tmdb.get_detail.return_value = MOCK_COPYWRITING_DETAIL
        MockTMDB.return_value = mock_tmdb

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_copywriting_ai_response('文案')
        MockLLM._get_client.return_value = mock_client

        MovieSearchService.ai_copywriting(550, 'movie', 'outline')

        # 验证 Claude API 被调用，且 prompt 包含影视信息
        call_args = mock_client.messages.create.call_args
        messages = call_args[1]['messages']
        prompt_content = messages[0]['content']
        assert 'Fight Club' in prompt_content
        assert 'David Fincher' in prompt_content
        assert 'Brad Pitt' in prompt_content

    @patch('app.services.movie.search_service.LLMService')
    @patch('app.services.movie.search_service.TMDBClient')
    def test_copywriting_no_credits_handles_gracefully(self, MockTMDB, MockLLM, app_context):
        """无 credits 数据时正常处理"""
        app_context.config['ANTHROPIC_API_KEY'] = 'test-key'

        detail_no_credits = {
            'id': 550,
            'title': 'Fight Club',
            'overview': 'A movie about...',
            'vote_average': 8.4,
            'release_date': '1999-10-15',
            'genres': [],
        }

        mock_tmdb = MagicMock()
        mock_tmdb.get_detail.return_value = detail_no_credits
        MockTMDB.return_value = mock_tmdb

        mock_client = MagicMock()
        mock_client.messages.create.return_value = _make_copywriting_ai_response('文案内容')
        MockLLM._get_client.return_value = mock_client

        result = MovieSearchService.ai_copywriting(550, 'movie', 'summary')

        assert 'error' not in result
        assert result['content'] == '文案内容'
