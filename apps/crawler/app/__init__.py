from flask import Flask
from flask_cors import CORS

from app.config import config_map
from app.extensions import init_mongo, init_mysql, init_redis, scheduler


def create_app(config_name: str = 'development') -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_map[config_name])

    # Extensions
    init_mongo(app)
    init_mysql(app)
    init_redis(app)
    CORS(app, resources={r'/crawler/*': {'origins': '*'}})

    # 线程池
    from app.services.task_service import init_executor
    init_executor(app)

    # APScheduler
    if app.config.get('SCHEDULER_ENABLED', True):
        scheduler.init_app(app)
        scheduler.start()

        # 加载定时任务（必须在 scheduler.start() 之后）
        with app.app_context():
            from app.services.scheduler_service import SchedulerService
            count = SchedulerService.load_all_tasks()
            app.logger.info(f'Loaded {count} scheduled tasks')

    # Blueprints
    from app.api import api_bp
    app.register_blueprint(api_bp, url_prefix='/crawler')

    return app
