"""
依赖文件解析器（纯函数，无副作用）
"""
import json


def parse_package_json(text: str) -> dict | None:
    try:
        pkg = json.loads(text)
        return {
            'dependencies': list((pkg.get('dependencies') or {}).keys())[:30],
            'devDependencies': list((pkg.get('devDependencies') or {}).keys())[:20],
            'scripts': list((pkg.get('scripts') or {}).keys()),
        }
    except Exception:
        return None


def parse_requirements_txt(text: str) -> dict | None:
    lines = [
        l.strip().split('==')[0].split('>=')[0].split('[')[0]
        for l in text.splitlines()
        if l.strip() and not l.startswith('#') and not l.startswith('-')
    ]
    return {'pythonDeps': lines[:30]} if lines else None


def parse_pyproject_toml(text: str) -> dict | None:
    deps = []
    in_deps = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped in ('[project.dependencies]', '[tool.poetry.dependencies]'):
            in_deps = True
            continue
        if in_deps:
            if stripped.startswith('['):
                break
            if '=' in stripped or stripped.startswith('"'):
                name = stripped.strip('"').split('=')[0].split('>')[0].split('<')[0].split('"')[0].strip()
                if name and name != 'python':
                    deps.append(name)
    return {'pythonDeps': deps[:30]} if deps else {'hasPyproject': True}


def parse_go_mod(text: str) -> dict | None:
    deps = []
    in_require = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped == 'require (':
            in_require = True
            continue
        if in_require:
            if stripped == ')':
                break
            parts = stripped.split()
            if parts:
                deps.append(parts[0])
    return {'goDeps': deps[:30]} if deps else {'hasGoMod': True}


def parse_cargo_toml(text: str) -> dict | None:
    deps = []
    in_deps = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped == '[dependencies]':
            in_deps = True
            continue
        if in_deps:
            if stripped.startswith('['):
                break
            if '=' in stripped:
                name = stripped.split('=')[0].strip()
                if name:
                    deps.append(name)
    return {'rustDeps': deps[:30]} if deps else {'hasCargo': True}


def parse_composer_json(text: str) -> dict | None:
    try:
        data = json.loads(text)
        return {
            'require': list((data.get('require') or {}).keys())[:30],
            'requireDev': list((data.get('require-dev') or {}).keys())[:20],
        }
    except Exception:
        return None


# 解析器名称 → 函数映射（供 GitHub 采集器按名称调用）
PARSER_MAP = {
    'parse_package_json': parse_package_json,
    'parse_requirements_txt': parse_requirements_txt,
    'parse_pyproject_toml': parse_pyproject_toml,
    'parse_go_mod': parse_go_mod,
    'parse_cargo_toml': parse_cargo_toml,
    'parse_composer_json': parse_composer_json,
}
