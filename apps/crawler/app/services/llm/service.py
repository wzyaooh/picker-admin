"""LLM Service — Anthropic Claude 调用逻辑

继承 BaseLLMService 获取通用能力（get_client / extract_text / parse_json / call_stream 等），
本模块只包含 crawler 特有的 prompt 构建和业务调用逻辑。
"""
import json
import logging

from flask import current_app
from packages.llm_service.base import BaseLLMService

from app.services.llm.prompts import (
    ARTICLE_PROMPT,
    COMMON_FIELDS,
    COMMON_QUALITY,
    COMMON_TAIL_FIELDS,
    DATA_HEADER,
    POLISH_ANALYSIS_PROMPT,
    POLISH_TUTORIAL_PROMPT,
    TUTORIAL_PROMPT,
    TYPE_PROMPTS,
)

logger = logging.getLogger(__name__)


class LLMService(BaseLLMService):
    """Anthropic Claude LLM 服务，支持多轮调用：结构化分析 + 文章生成 + 润色"""

    @staticmethod
    def _build_prompt(raw_data: dict, extra_data: dict) -> str:
        """构建第一轮结构化分析 prompt"""
        project_type = extra_data.get('projectType', 'other')
        detected_language = extra_data.get('detectedLanguage', 'unknown')
        all_languages = extra_data.get('allLanguages', {})

        slim_extra = LLMService._slim_extra(extra_data)

        type_prompt_tpl = TYPE_PROMPTS.get(project_type, TYPE_PROMPTS['other'])

        header = DATA_HEADER.format(
            raw_data=json.dumps(raw_data, ensure_ascii=False, default=str)[:12000],
            extra_data=json.dumps(slim_extra, ensure_ascii=False, default=str)[:18000],
            detected_language=detected_language,
            all_languages=json.dumps(all_languages, ensure_ascii=False),
            project_type=project_type,
        )

        type_prompt = type_prompt_tpl.format(
            detected_language=detected_language,
            project_type=project_type,
            common_fields=COMMON_FIELDS,
            common_tail=COMMON_TAIL_FIELDS,
            quality_rules=COMMON_QUALITY,
        )

        return header + '\n' + type_prompt

    @staticmethod
    def enrich(raw_data: dict, extra_data: dict) -> dict:
        """第一轮：结构化分析（不含 generatedArticle）"""
        prompt = LLMService._build_prompt(raw_data, extra_data)
        logger.info(f'[LLM] 第一轮分析: prompt长度={len(prompt)}')

        raw_text, tokens_used = LLMService.call_stream(prompt)
        logger.info(f'[LLM] 第一轮完成: tokens={tokens_used}, 响应长度={len(raw_text)}')

        try:
            parsed = LLMService.parse_json(raw_text)
        except ValueError as e:
            logger.error(f'[LLM] JSON 解析失败，响应前 2000 字符:\n{raw_text[:2000]}')
            logger.error(f'[LLM] JSON 解析失败，响应后 1000 字符:\n{raw_text[-1000:]}')
            raise

        parsed['_projectType'] = extra_data.get('projectType', 'other')
        parsed['_detectedLanguage'] = extra_data.get('detectedLanguage', 'unknown')

        return {
            'parsed': parsed,
            'raw_response': raw_text,
            'model': LLMService.get_model(),
            'tokens_used': tokens_used,
        }

    @staticmethod
    def generate_article(raw_data: dict, extra_data: dict, analysis_result: dict) -> dict:
        """第二轮：专属文章生成"""
        article_max_tokens = current_app.config.get('ANTHROPIC_ARTICLE_MAX_TOKENS', 16384)

        slim_extra = LLMService._slim_extra(extra_data)
        slim_analysis = {k: v for k, v in analysis_result.items()
                         if not k.startswith('_') and k not in ('raw_response',)}

        prompt = ARTICLE_PROMPT.format(
            raw_data=json.dumps(raw_data, ensure_ascii=False, default=str)[:12000],
            extra_data=json.dumps(slim_extra, ensure_ascii=False, default=str)[:18000],
            analysis_result=json.dumps(slim_analysis, ensure_ascii=False, default=str)[:20000],
        )

        logger.info(f'[LLM] 第二轮文章生成: max_tokens={article_max_tokens}, prompt长度={len(prompt)}')

        article_text, tokens_used = LLMService.call_stream(prompt, max_tokens=article_max_tokens)
        logger.info(f'[LLM] 第二轮完成: tokens={tokens_used}, 文章长度={len(article_text)}')

        return {
            'article': article_text.strip(),
            'model': LLMService.get_model(),
            'tokens_used': tokens_used,
        }

    @staticmethod
    def generate_tutorial(raw_data: dict, extra_data: dict, analysis_result: dict) -> dict:
        """第三轮：实践部署教程生成"""
        article_max_tokens = current_app.config.get('ANTHROPIC_ARTICLE_MAX_TOKENS', 16384)

        slim_extra = LLMService._slim_extra(extra_data)
        slim_analysis = {k: v for k, v in analysis_result.items()
                         if not k.startswith('_') and k not in ('raw_response',)}

        prompt = TUTORIAL_PROMPT.format(
            raw_data=json.dumps(raw_data, ensure_ascii=False, default=str)[:12000],
            extra_data=json.dumps(slim_extra, ensure_ascii=False, default=str)[:18000],
            analysis_result=json.dumps(slim_analysis, ensure_ascii=False, default=str)[:20000],
        )

        logger.info(f'[LLM] 第三轮教程生成: max_tokens={article_max_tokens}, prompt长度={len(prompt)}')

        tutorial_text, tokens_used = LLMService.call_stream(prompt, max_tokens=article_max_tokens)
        logger.info(f'[LLM] 第三轮完成: tokens={tokens_used}, 教程长度={len(tutorial_text)}')

        return {
            'article': tutorial_text.strip(),
            'model': LLMService.get_model(),
            'tokens_used': tokens_used,
        }

    @staticmethod
    def polish_article(original_content: str, data_diff: str,
                       extra_data: dict, analysis_result: dict,
                       article_type: str = 'analysis',
                       custom_instructions: str = '') -> dict:
        """文章润色：基于原文 + 数据变化生成润色版本"""
        from datetime import date
        article_max_tokens = current_app.config.get('ANTHROPIC_ARTICLE_MAX_TOKENS', 16384)

        slim_extra = LLMService._slim_extra(extra_data)
        slim_analysis = {k: v for k, v in analysis_result.items()
                         if not k.startswith('_') and k not in ('raw_response',)}

        current_date = date.today().strftime('%Y-%m-%d')
        polish_prompt_tpl = POLISH_TUTORIAL_PROMPT if article_type == 'tutorial' else POLISH_ANALYSIS_PROMPT

        prompt = polish_prompt_tpl.format(
            original_article=original_content[:20000],
            data_diff=data_diff,
            analysis_result=json.dumps(slim_analysis, ensure_ascii=False, default=str)[:15000],
            extra_data=json.dumps(slim_extra, ensure_ascii=False, default=str)[:15000],
            current_date=current_date,
        )

        if custom_instructions:
            prompt += f'\n\n## 用户自定义润色方向（最高优先级，必须严格遵守）\n\n{custom_instructions}\n'

        logger.info(f'[LLM] 文章润色 ({article_type}): max_tokens={article_max_tokens}, prompt长度={len(prompt)}')

        raw_text, tokens_used = LLMService.call_stream(prompt, max_tokens=article_max_tokens)
        logger.info(f'[LLM] 润色完成: tokens={tokens_used}, 响应长度={len(raw_text)}')

        parsed = LLMService.parse_json(raw_text)

        return {
            'content': parsed.get('content', ''),
            'polish_summary': parsed.get('polishSummary', ''),
            'model': LLMService.get_model(),
            'tokens_used': tokens_used,
        }

    @staticmethod
    def _slim_extra(extra_data: dict) -> dict:
        """精简 extra_data，保留关键信息，避免 prompt 过长"""
        slim = {}
        keep_keys = [
            'projectType', 'detectedLanguage', 'allLanguages',
            'repoInfo', 'commitFrequency', 'issuesTopics',
            'recentReleases', 'dependencies', 'devDependencies',
            'projectStructure', 'deployFiles', 'ciFiles',
            'webArticles', 'readmeImages',
        ]
        for key in keep_keys:
            if key in extra_data and extra_data[key]:
                slim[key] = extra_data[key]

        readme = extra_data.get('readme', '')
        if readme:
            slim['readme'] = readme[:6000]

        return slim
