"""LLM 服务子包

将原 llm_service.py（1247 行）拆分为 prompts + service 两个模块。
"""
from app.services.llm.service import LLMService

__all__ = ['LLMService']
