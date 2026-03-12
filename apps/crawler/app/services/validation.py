"""数据校验服务"""

import re
from urllib.parse import urlparse

from app.services.spider_service import SPIDER_REGISTRY

# cron 各段的合法范围
_CRON_RANGES = {
    'minute': (0, 59),
    'hour': (0, 23),
    'day': (1, 31),
    'month': (1, 12),
    'weekday': (0, 6),
}

_CRON_FIELD_NAMES = list(_CRON_RANGES.keys())

# 匹配单个 cron 段的基本模式：数字、*、范围、步进、列表
_CRON_SEGMENT_RE = re.compile(
    r'^(\*|\d+(-\d+)?)(/\d+)?(,(\*|\d+(-\d+)?)(/\d+)?)*$'
)


def _validate_cron_segment(segment: str, field_name: str, lo: int, hi: int) -> str | None:
    """验证单个 cron 段，返回错误信息或 None"""
    if not segment:
        return f'cron 字段 {field_name} 不能为空'

    if not _CRON_SEGMENT_RE.match(segment):
        return f'cron 字段 {field_name} 格式无效: {segment}'

    # 验证数值范围
    for part in segment.split(','):
        # 去掉步进部分
        base = part.split('/')[0]
        if base == '*':
            continue
        # 处理范围 a-b
        if '-' in base:
            parts = base.split('-')
            if len(parts) != 2:
                return f'cron 字段 {field_name} 范围格式无效: {base}'
            try:
                a, b = int(parts[0]), int(parts[1])
            except ValueError:
                return f'cron 字段 {field_name} 包含非数字值: {base}'
            if a < lo or a > hi or b < lo or b > hi:
                return f'cron 字段 {field_name} 值超出范围 ({lo}-{hi}): {base}'
            if a > b:
                return f'cron 字段 {field_name} 范围起始大于结束: {base}'
        else:
            try:
                val = int(base)
            except ValueError:
                return f'cron 字段 {field_name} 包含非数字值: {base}'
            if val < lo or val > hi:
                return f'cron 字段 {field_name} 值超出范围 ({lo}-{hi}): {val}'

        # 验证步进值
        if '/' in part:
            step_str = part.split('/')[1]
            try:
                step = int(step_str)
            except ValueError:
                return f'cron 字段 {field_name} 步进值无效: {step_str}'
            if step < 1:
                return f'cron 字段 {field_name} 步进值必须大于 0: {step}'

    return None


class ValidationService:
    """数据校验服务"""

    @staticmethod
    def validate_cron(cron_expr: str) -> str | None:
        """验证 5 段 cron 表达式（分 时 日 月 周），返回错误信息或 None"""
        if not isinstance(cron_expr, str):
            return '无效的 cron 表达式: 必须为字符串'

        cron_expr = cron_expr.strip()
        if not cron_expr:
            return '无效的 cron 表达式: 不能为空'

        segments = cron_expr.split()
        if len(segments) != 5:
            return f'无效的 cron 表达式: 需要 5 段（分 时 日 月 周），实际 {len(segments)} 段'

        for i, segment in enumerate(segments):
            field_name = _CRON_FIELD_NAMES[i]
            lo, hi = _CRON_RANGES[field_name]
            error = _validate_cron_segment(segment, field_name, lo, hi)
            if error:
                return f'无效的 cron 表达式: {error}'

        return None

    @staticmethod
    def validate_url(url: str) -> str | None:
        """验证 HTTP/HTTPS URL，返回错误信息或 None"""
        if not isinstance(url, str):
            return '无效的 URL: 必须为字符串'

        url = url.strip()
        if not url:
            return '无效的 URL: 不能为空'

        if not url.startswith(('http://', 'https://')):
            return f'无效的 URL: 必须以 http:// 或 https:// 开头'

        try:
            parsed = urlparse(url)
            if not parsed.netloc:
                return f'无效的 URL: 缺少主机名'
        except Exception:
            return f'无效的 URL: 格式不正确'

        return None

    @staticmethod
    def validate_spider_name(name: str) -> str | None:
        """验证爬虫名称是否已注册，返回错误信息或 None"""
        if not isinstance(name, str):
            return '无效的爬虫名称: 必须为字符串'

        if name not in SPIDER_REGISTRY:
            available = list(SPIDER_REGISTRY.keys())
            return f'未知爬虫: {name}, 可用: {available}'

        return None

    @staticmethod
    def validate_config(config) -> str | None:
        """验证 config 为字典类型，返回错误信息或 None"""
        if not isinstance(config, dict):
            return 'config 必须为 JSON 对象'

        return None

    @staticmethod
    def validate_task_data(data: dict, is_create: bool = True) -> str | None:
        """综合校验任务数据，返回第一个错误信息或 None

        创建模式（is_create=True）：要求 name、spiderName、targetUrl 必填
        更新模式（is_create=False）：所有字段可选，仅校验提供的字段
        """
        if not isinstance(data, dict):
            return '请求数据必须为 JSON 对象'

        # 创建模式：必填字段检查
        if is_create:
            if not data.get('name'):
                return '任务名称不能为空'
            if not data.get('spiderName'):
                return '爬虫名称不能为空'
            if not data.get('targetUrl'):
                return '目标 URL 不能为空'

        # 校验 cronExpr（如果提供）
        if 'cronExpr' in data and data['cronExpr']:
            error = ValidationService.validate_cron(data['cronExpr'])
            if error:
                return error

        # 校验 targetUrl（如果提供）
        if 'targetUrl' in data and data['targetUrl']:
            error = ValidationService.validate_url(data['targetUrl'])
            if error:
                return error

        # 校验 spiderName（创建时必须校验）
        if is_create and 'spiderName' in data and data['spiderName']:
            error = ValidationService.validate_spider_name(data['spiderName'])
            if error:
                return error

        # 校验 config（如果提供）
        if 'config' in data and data['config'] is not None:
            error = ValidationService.validate_config(data['config'])
            if error:
                return error

        return None
