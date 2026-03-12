"""通用辅助函数

ok/fail 响应构造、分页参数提取、camelCase ↔ snake_case 转换。
"""
import re

from flask import jsonify, request


def ok(data=None, message='success'):
    """构造成功响应"""
    return jsonify({'code': 0, 'data': data, 'message': message})


def fail(message='error', code=1):
    """构造失败响应"""
    return jsonify({'code': code, 'message': message})


def get_pagination_params(default_page_size: int = 10) -> tuple[int, int]:
    """从 request.args 提取分页参数，返回 (page, page_size)"""
    page = request.args.get('pageNo', 1, type=int)
    page_size = request.args.get('pageSize', default_page_size, type=int)
    return page, page_size


def camel_to_snake(name: str) -> str:
    """camelCase → snake_case"""
    s1 = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


def snake_to_camel(name: str) -> str:
    """snake_case → camelCase"""
    parts = name.split('_')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])


def camel_dict_to_snake(data: dict, keys: list[str] | None = None) -> dict:
    """将 dict 的 camelCase key 转为 snake_case

    Args:
        data: 原始字典
        keys: 如果指定，只转换这些 key；否则转换全部
    """
    if keys:
        return {camel_to_snake(k): data[k] for k in keys if k in data}
    return {camel_to_snake(k): v for k, v in data.items()}
