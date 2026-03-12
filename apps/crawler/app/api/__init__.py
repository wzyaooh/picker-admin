from flask import Blueprint

api_bp = Blueprint('api', __name__)

from app.api import task, spider, stats, enrich, article  # noqa: E402, F401
