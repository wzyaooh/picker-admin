"""共享 LLM 服务基类

提供 Anthropic Claude API 的通用调用能力：客户端创建、JSON 解析、文本提取。
crawler 项目使用此包。
"""
from packages.llm_service.base import BaseLLMService

__all__ = ['BaseLLMService']
