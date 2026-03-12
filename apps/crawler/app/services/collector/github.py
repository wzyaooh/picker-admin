"""
GitHub API 数据采集：仓库信息、README、依赖、部署文件、Releases、Issues、CI 等
"""
import logging
import random
import time

import requests

from .constants import GITHUB_API, LANG_DEP_FILES, USER_AGENTS
from .constants import (
    PROJECT_TYPE_APPLICATION, PROJECT_TYPE_CLI, PROJECT_TYPE_DATA,
    PROJECT_TYPE_DOCS, PROJECT_TYPE_LIBRARY,
)
from .parsers import PARSER_MAP

logger = logging.getLogger(__name__)


class GitHubCollector:
    """GitHub API 数据采集器"""

    def __init__(self, token: str | None = None):
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': random.choice(USER_AGENTS),
        })
        if token:
            self.session.headers['Authorization'] = f'token {token}'
        self.timeout = 15
        self.delay = 0.3
        self.rate_limited = False

    def close(self):
        self.session.close()

    # ------------------------------------------------------------------
    # HTTP 工具
    # ------------------------------------------------------------------

    def safe_get(self, url: str) -> requests.Response | None:
        try:
            resp = self.session.get(url, timeout=self.timeout)
            if resp.status_code == 200:
                return resp
            if resp.status_code == 403 and 'api.github.com' in url:
                self.rate_limited = True
                logger.warning(f'[GitHub] ⚠️ API 403 限流: {url}')
            elif resp.status_code not in (404, 451):
                logger.debug(f'[GitHub] HTTP {resp.status_code}: {url}')
        except requests.exceptions.Timeout:
            logger.warning(f'[GitHub] 请求超时 ({self.timeout}s): {url}')
        except Exception as e:
            logger.debug(f'[GitHub] 请求失败: {url} → {type(e).__name__}: {e}')
        time.sleep(self.delay)
        return None

    # ------------------------------------------------------------------
    # 仓库元信息
    # ------------------------------------------------------------------

    def fetch_repo_info(self, full_name: str) -> dict | None:
        resp = self.safe_get(f'{GITHUB_API}/repos/{full_name}')
        if not resp:
            return None
        try:
            data = resp.json()
            info = {
                'language': data.get('language'),
                'description': data.get('description', ''),
                'topics': data.get('topics', []),
                'size': data.get('size', 0),
                'hasWiki': data.get('has_wiki', False),
                'hasPages': data.get('has_pages', False),
                'isTemplate': data.get('is_template', False),
                'license': data.get('license', {}).get('spdx_id') if data.get('license') else None,
                'defaultBranch': data.get('default_branch', 'main'),
                'openIssuesCount': data.get('open_issues_count', 0),
                'forksCount': data.get('forks_count', 0),
                'stargazersCount': data.get('stargazers_count', 0),
                'archived': data.get('archived', False),
            }
        except Exception:
            return None

        if not self.rate_limited:
            lang_resp = self.safe_get(f'{GITHUB_API}/repos/{full_name}/languages')
            if lang_resp:
                try:
                    info['languages'] = lang_resp.json()
                except Exception:
                    info['languages'] = {}
            else:
                info['languages'] = {}
        return info

    # ------------------------------------------------------------------
    # 项目类型检测
    # ------------------------------------------------------------------

    @staticmethod
    def detect_project_type(raw_data: dict, repo_info: dict | None) -> str:
        description = (raw_data.get('description') or '').lower()
        topics = (repo_info or {}).get('topics', [])
        language = (repo_info or {}).get('language') or raw_data.get('language', '')
        languages = (repo_info or {}).get('languages', {})
        has_pages = (repo_info or {}).get('hasPages', False)
        topics_lower = [t.lower() for t in topics]
        full_name = raw_data.get('fullName', '?')

        doc_signals = ('awesome', 'list', 'tutorial', 'guide', 'cheatsheet',
                       'interview', 'roadmap', 'book', 'course', 'learn')
        if [s for s in doc_signals if s in description]:
            return PROJECT_TYPE_DOCS
        if [s for s in doc_signals if any(s in t for t in topics_lower)]:
            return PROJECT_TYPE_DOCS
        if not language or language in ('', None):
            total_bytes = sum(languages.values()) if languages else 0
            md_bytes = languages.get('Markdown', 0) + languages.get('HTML', 0)
            if total_bytes > 0 and md_bytes / total_bytes > 0.6:
                return PROJECT_TYPE_DOCS
        if has_pages and not language:
            return PROJECT_TYPE_DOCS

        data_signals = ('dataset', 'model', 'pretrained', 'weights', 'benchmark')
        if [s for s in data_signals if s in description]:
            return PROJECT_TYPE_DATA
        if [s for s in data_signals if any(s in t for t in topics_lower)]:
            return PROJECT_TYPE_DATA

        cli_signals = ('cli', 'command-line', 'terminal', 'console')
        if [s for s in cli_signals if s in description]:
            return PROJECT_TYPE_CLI
        if [s for s in cli_signals if any(s in t for t in topics_lower)]:
            return PROJECT_TYPE_CLI

        lib_signals = ('library', 'framework', 'sdk', 'api', 'plugin', 'package', 'module')
        if [s for s in lib_signals if s in description]:
            return PROJECT_TYPE_LIBRARY
        if [s for s in lib_signals if any(s in t for t in topics_lower)]:
            return PROJECT_TYPE_LIBRARY

        return PROJECT_TYPE_APPLICATION

    # ------------------------------------------------------------------
    # README
    # ------------------------------------------------------------------

    def fetch_readme(self, full_name: str) -> str | None:
        resp = self.safe_get(f'{GITHUB_API}/repos/{full_name}/readme')
        if not resp:
            return None
        download_url = resp.json().get('download_url')
        if not download_url:
            return None
        raw_resp = self.safe_get(download_url)
        return raw_resp.text if raw_resp else None

    # ------------------------------------------------------------------
    # 依赖文件（智能按语言选择）
    # ------------------------------------------------------------------

    def fetch_dependencies(self, full_name: str, primary_lang: str, all_languages: dict) -> dict | None:
        deps = {}
        langs_to_check = set()
        if primary_lang:
            langs_to_check.add(primary_lang)
        if all_languages:
            total = sum(all_languages.values())
            for lang, bytes_count in all_languages.items():
                if total > 0 and bytes_count / total > 0.1:
                    langs_to_check.add(lang)

        checked_files = set()
        for lang in langs_to_check:
            if self.rate_limited:
                break
            dep_files = LANG_DEP_FILES.get(lang, [])
            for filename, parser_name in dep_files:
                if filename in checked_files or '*' in filename:
                    continue
                checked_files.add(filename)
                resp = self.safe_get(f'{GITHUB_API}/repos/{full_name}/contents/{filename}')
                if not resp:
                    continue
                download_url = resp.json().get('download_url')
                if not download_url:
                    continue
                if parser_name and parser_name in PARSER_MAP:
                    raw = self.safe_get(download_url)
                    if raw:
                        parsed = PARSER_MAP[parser_name](raw.text)
                        if parsed:
                            deps[filename] = parsed
                else:
                    deps[filename] = True
        return deps if deps else None

    # ------------------------------------------------------------------
    # 部署文件
    # ------------------------------------------------------------------

    def fetch_deploy_files(self, full_name: str) -> dict | None:
        deploy = {}
        for filename in ('Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'):
            if self.rate_limited:
                break
            resp = self.safe_get(f'{GITHUB_API}/repos/{full_name}/contents/{filename}')
            if resp:
                download_url = resp.json().get('download_url')
                if download_url:
                    raw = self.safe_get(download_url)
                    if raw:
                        deploy[filename] = raw.text[:3000]
                break

        if self.rate_limited:
            return deploy if deploy else None

        resp = self.safe_get(f'{GITHUB_API}/repos/{full_name}/contents/.github/workflows')
        if resp:
            try:
                files = resp.json()
                if isinstance(files, list):
                    deploy['ciWorkflows'] = [f['name'] for f in files[:10]]
            except Exception:
                pass

        if not self.rate_limited:
            for path in ('helm', 'charts', 'k8s', 'deploy'):
                resp = self.safe_get(f'{GITHUB_API}/repos/{full_name}/contents/{path}')
                if resp:
                    deploy['hasK8sOrHelm'] = path
                    break
        return deploy if deploy else None

    # ------------------------------------------------------------------
    # Releases
    # ------------------------------------------------------------------

    def fetch_releases(self, full_name: str) -> list | None:
        resp = self.safe_get(f'{GITHUB_API}/repos/{full_name}/releases?per_page=5')
        if not resp:
            return None
        try:
            data = resp.json()
            return [
                {
                    'tag': r['tag_name'],
                    'name': r.get('name', ''),
                    'date': r.get('published_at', ''),
                    'prerelease': r.get('prerelease', False),
                }
                for r in data[:5]
            ]
        except Exception:
            return None

    # ------------------------------------------------------------------
    # Issues
    # ------------------------------------------------------------------

    def fetch_issues_topics(self, full_name: str) -> list | None:
        resp = self.safe_get(
            f'{GITHUB_API}/repos/{full_name}/issues?state=open&sort=comments&direction=desc&per_page=5'
        )
        if not resp:
            return None
        topics = []
        try:
            for issue in resp.json()[:5]:
                if 'pull_request' in issue:
                    continue
                topics.append({
                    'type': 'issue',
                    'title': issue.get('title', ''),
                    'labels': [l['name'] for l in issue.get('labels', [])[:5]],
                    'comments': issue.get('comments', 0),
                    'createdAt': issue.get('created_at', ''),
                })
        except Exception:
            pass
        return topics if topics else None

    # ------------------------------------------------------------------
    # 提交频率
    # ------------------------------------------------------------------

    def fetch_commit_frequency(self, full_name: str) -> dict | None:
        result = {}
        resp = self.safe_get(f'{GITHUB_API}/repos/{full_name}/commits?per_page=1')
        if resp:
            try:
                commits = resp.json()
                if commits:
                    last_commit = commits[0].get('commit', {})
                    result['lastCommitDate'] = last_commit.get('committer', {}).get('date', '')
                    result['lastCommitMessage'] = last_commit.get('message', '')[:200]
            except Exception:
                pass

        resp = self.safe_get(f'{GITHUB_API}/repos/{full_name}/stats/participation')
        if resp:
            try:
                data = resp.json()
                weekly = data.get('all', [])
                if weekly:
                    result['weeklyCommits'] = weekly[-4:]
                    result['last4WeeksTotal'] = sum(weekly[-4:])
            except Exception:
                pass
        return result if result else None

    # ------------------------------------------------------------------
    # 项目结构（文件树）
    # ------------------------------------------------------------------

    def fetch_project_structure(self, full_name: str, default_branch: str = 'main') -> dict | None:
        """获取仓库文件树结构，用于分析项目架构"""
        resp = self.safe_get(
            f'{GITHUB_API}/repos/{full_name}/git/trees/{default_branch}?recursive=1'
        )
        if not resp:
            return None
        try:
            data = resp.json()
            tree = data.get('tree', [])
            truncated = data.get('truncated', False)

            # 过滤掉常见的无关文件/目录
            ignore_prefixes = (
                'node_modules/', '.git/', 'vendor/', 'dist/', 'build/',
                '__pycache__/', '.venv/', 'venv/', '.tox/', '.mypy_cache/',
                '.pytest_cache/', '.next/', '.nuxt/', 'target/', '.gradle/',
                'Pods/', '.idea/', '.vscode/', '.DS_Store',
            )
            ignore_suffixes = (
                '.pyc', '.pyo', '.class', '.o', '.so', '.dll',
                '.min.js', '.min.css', '.map', '.lock',
                '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
                '.woff', '.woff2', '.ttf', '.eot',
                '.mp3', '.mp4', '.wav', '.avi',
                '.zip', '.tar', '.gz', '.rar',
            )

            filtered = []
            for item in tree:
                path = item.get('path', '')
                if any(path.startswith(p) or ('/' + p) in path for p in ignore_prefixes):
                    continue
                if any(path.endswith(s) for s in ignore_suffixes):
                    continue
                filtered.append({
                    'path': path,
                    'type': item.get('type', ''),  # blob / tree
                    'size': item.get('size', 0),
                })

            # 构建目录统计
            dirs = set()
            file_types = {}
            for item in filtered:
                if item['type'] == 'blob':
                    ext = item['path'].rsplit('.', 1)[-1] if '.' in item['path'] else ''
                    if ext:
                        file_types[ext] = file_types.get(ext, 0) + 1
                elif item['type'] == 'tree':
                    dirs.add(item['path'])

            # 只保留前 500 个文件条目（避免超大仓库）
            tree_items = filtered[:500]

            # 生成简洁的文本树形结构（用于 LLM 分析）
            tree_text = self._build_tree_text(tree_items)

            return {
                'treeText': tree_text,
                'totalFiles': len([i for i in filtered if i['type'] == 'blob']),
                'totalDirs': len(dirs),
                'fileTypes': dict(sorted(file_types.items(), key=lambda x: -x[1])[:20]),
                'truncated': truncated,
                'topLevelEntries': [
                    i['path'] for i in filtered
                    if '/' not in i['path']
                ][:30],
            }
        except Exception as e:
            logger.debug(f'[GitHub] 获取项目结构失败 {full_name}: {e}')
            return None

    @staticmethod
    def _build_tree_text(items: list, max_lines: int = 200) -> str:
        """将文件列表构建为缩进的树形文本"""
        lines = []
        for item in items:
            if len(lines) >= max_lines:
                lines.append(f'... (共 {len(items)} 个条目，已截断)')
                break
            path = item['path']
            depth = path.count('/')
            name = path.rsplit('/', 1)[-1] if '/' in path else path
            prefix = '  ' * depth
            suffix = '/' if item['type'] == 'tree' else ''
            lines.append(f'{prefix}{name}{suffix}')
        return '\n'.join(lines)

    # ------------------------------------------------------------------
    # CI 状态
    # ------------------------------------------------------------------

    def fetch_ci_status(self, full_name: str) -> dict | None:
        resp = self.safe_get(
            f'{GITHUB_API}/repos/{full_name}/actions/runs?per_page=3&status=completed'
        )
        if not resp:
            return None
        try:
            data = resp.json()
            runs = data.get('workflow_runs', [])
            if not runs:
                return None
            return {
                'totalRuns': data.get('total_count', 0),
                'recentRuns': [
                    {
                        'name': r.get('name', ''),
                        'conclusion': r.get('conclusion', ''),
                        'createdAt': r.get('created_at', ''),
                    }
                    for r in runs[:3]
                ],
            }
        except Exception:
            return None
