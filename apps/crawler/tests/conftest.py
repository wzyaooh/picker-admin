import pytest
from app import create_app


@pytest.fixture
def app():
    """创建测试用 Flask 应用"""
    app = create_app('testing')
    app.config['TMDB_API_KEY'] = 'test-api-key-12345'
    app.config['TMDB_BASE_URL'] = 'https://api.themoviedb.org/3'
    return app


@pytest.fixture
def app_context(app):
    """提供 Flask 应用上下文"""
    from app.services.movie.tmdb_client import TMDBClient
    with app.app_context():
        # 每个测试重置共享 session，避免测试间状态泄漏
        TMDBClient._shared_session = None
        TMDBClient._last_request_time = 0.0
        yield app
