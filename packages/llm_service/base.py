"""BaseLLMService — Anthropic Claude 通用调用基类

提供客户端创建、JSON 解析、文本提取等通用方法，
以及高层便捷调用方法（call / call_stream / call_json）。
子类（crawler LLMService）继承并扩展。
"""
import json
import logging
import re

import anthropic
from flask import current_app

logger = logging.getLogger(__name__)


class BaseLLMService:
    """Anthropic Claude LLM 通用基类"""

    # ── 基础工具方法 ──────────────────────────────────────────

    @staticmethod
    def get_client():
        """获取 Anthropic 客户端"""
        api_key = current_app.config.get('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError('ANTHROPIC_API_KEY 未配置')

        base_url = current_app.config.get('ANTHROPIC_BASE_URL')
        kwargs = {'api_key': api_key}
        if base_url:
            kwargs['base_url'] = base_url

        return anthropic.Anthropic(**kwargs)

    @staticmethod
    def get_model() -> str:
        """获取当前配置的模型名称"""
        return current_app.config.get('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')

    @staticmethod
    def get_max_tokens() -> int:
        """获取当前配置的 max_tokens"""
        return current_app.config.get('ANTHROPIC_MAX_TOKENS', 16384)

    @staticmethod
    def extract_text(response) -> str:
        """从响应中提取文本内容，跳过 ThinkingBlock 等非文本块"""
        for block in response.content:
            if block.type == 'text':
                return block.text
        raise ValueError('LLM 响应中未找到 text 类型的内容块')

    @staticmethod
    def parse_json(text: str) -> dict:
        """从 LLM 响应中提取 JSON（dict）"""
        # 1. 直接解析
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 2. 提取 ```json ... ``` 代码块
        match = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # 3. 跳过 <thinking> 标签后的内容
        thinking_end = text.find('</thinking>')
        if thinking_end != -1:
            after_thinking = text[thinking_end + len('</thinking>'):].strip()
            
            # 3.1 尝试提取 thinking 后的代码块
            match = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', after_thinking, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    pass
            
            # 3.2 尝试直接解析 thinking 后的内容
            try:
                return json.loads(after_thinking)
            except json.JSONDecodeError:
                pass
            
            # 3.3 提取 thinking 后第一个 { 到最后一个 }
            first_brace = after_thinking.find('{')
            last_brace = after_thinking.rfind('}')
            if first_brace != -1 and last_brace > first_brace:
                try:
                    return json.loads(after_thinking[first_brace:last_brace + 1])
                except json.JSONDecodeError:
                    pass

        # 4. 提取第一个 { 到最后一个 }（全文）
        first_brace = text.find('{')
        last_brace = text.rfind('}')
        if first_brace != -1 and last_brace > first_brace:
            try:
                return json.loads(text[first_brace:last_brace + 1])
            except json.JSONDecodeError:
                pass

        logger.error(f'[LLM] JSON 解析失败，响应前 1000 字符: {text[:1000]}')
        logger.error(f'[LLM] JSON 解析失败，响应后 500 字符: {text[-500:]}')
        raise ValueError('无法从 LLM 响应中解析 JSON')

    @staticmethod
    def parse_json_safe(text: str) -> dict | list | None:
        """安全解析 LLM 返回的 JSON，支持 dict 和 list，失败返回 None"""
        # 1. 直接解析
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError):
            pass

        # 2. 提取 ```json ... ``` 代码块
        match = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except (json.JSONDecodeError, TypeError):
                pass

        # 3. 提取第一个 [ 或 { 到最后一个 ] 或 }
        first_bracket = -1
        for i, ch in enumerate(text):
            if ch in ('[', '{'):
                first_bracket = i
                break
        if first_bracket != -1:
            open_ch = text[first_bracket]
            close_ch = ']' if open_ch == '[' else '}'
            last_bracket = text.rfind(close_ch)
            if last_bracket > first_bracket:
                try:
                    return json.loads(text[first_bracket:last_bracket + 1])
                except (json.JSONDecodeError, TypeError):
                    pass

        logger.warning(f'[LLM] JSON 安全解析失败，响应前 300 字符: {text[:300]}')
        return None

    # ── 高层便捷调用方法 ──────────────────────────────────────

    @classmethod
    def call(cls, prompt: str, *, max_tokens: int | None = None,
             model: str | None = None) -> str:
        """非流式调用 LLM，返回文本内容"""
        client = cls.get_client()
        model = model or cls.get_model()
        max_tokens = max_tokens or cls.get_max_tokens()

        response = client.messages.create(
            model=model, max_tokens=max_tokens,
            messages=[{'role': 'user', 'content': prompt}],
        )
        return cls.extract_text(response)

    @classmethod
    def call_stream(cls, prompt: str, *, max_tokens: int | None = None,
                    model: str | None = None) -> tuple[str, int]:
        """流式调用 LLM，返回 (文本内容, tokens_used)"""
        client = cls.get_client()
        model = model or cls.get_model()
        max_tokens = max_tokens or cls.get_max_tokens()

        with client.messages.stream(
            model=model, max_tokens=max_tokens,
            messages=[{'role': 'user', 'content': prompt}],
        ) as stream:
            response = stream.get_final_message()

        text = cls.extract_text(response)
        tokens_used = (response.usage.input_tokens or 0) + (response.usage.output_tokens or 0)
        return text, tokens_used

    @classmethod
    def call_json(cls, prompt: str, *, max_tokens: int | None = None,
                  model: str | None = None) -> dict:
        """调用 LLM 并解析返回的 JSON（dict），解析失败抛异常"""
        text = cls.call(prompt, max_tokens=max_tokens, model=model)
        return cls.parse_json(text)

    @classmethod
    def call_json_safe(cls, prompt: str, *, max_tokens: int | None = None,
                       model: str | None = None) -> dict | list | None:
        """调用 LLM 并安全解析 JSON，失败返回 None"""
        text = cls.call(prompt, max_tokens=max_tokens, model=model)
        return cls.parse_json_safe(text)

    @classmethod
    def call_stream_json(cls, prompt: str, *, max_tokens: int | None = None,
                         model: str | None = None) -> tuple[dict, int]:
        """流式调用 LLM 并解析 JSON，返回 (parsed_dict, tokens_used)"""
        text, tokens_used = cls.call_stream(prompt, max_tokens=max_tokens, model=model)
        parsed = cls.parse_json(text)
        return parsed, tokens_used
