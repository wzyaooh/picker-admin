"""
多源数据采集器（门面模块）
协调 GitHubCollector 和 WebSearchCollector 完成项目数据采集
"""
import logging
import re
import time

from .constants import (
    PROJECT_TYPE_APPLICATION, PROJECT_TYPE_CLI, PROJECT_TYPE_DOCS,
    PROJECT_TYPE_LIBRARY,
)
from .github import GitHubCollector
from .web_search import WebSearchCollector

logger = logging.getLogger(__name__)

__all__ = ['DataCollector']


class DataCollector:
    """从多个来源采集项目补充数据，根据项目类型智能选择采集策略"""

    def __init__(self, token: str | None = None):
        self._github = GitHubCollector(token)
        self._web = WebSearchCollector()

    def close(self):
        self._github.close()
        self._web.close()

    # ------------------------------------------------------------------
    # 主入口
    # ------------------------------------------------------------------

    def collect(self, raw_data: dict) -> dict:
        full_name = raw_data.get('fullName', '')
        if not full_name:
            logger.warning('[DataCollector] fullName 为空，跳过采集')
            return {'sources': [], 'extra': {}}

        logger.info(f'[DataCollector] ---- 开始采集: {full_name} ----')
        collect_start = time.time()
        extra = {}
        sources = []
        gh = self._github

        # ===== 第一步：仓库元信息 =====
        logger.info(f'[DataCollector] {full_name}: [1] 获取仓库元信息...')
        t0 = time.time()
        repo_info = gh.fetch_repo_info(full_name)
        if repo_info:
            extra['repoInfo'] = repo_info
            sources.append('github_repo_info')
            logger.info(
                f'[DataCollector] {full_name}: [1] 成功 '
                f'({time.time() - t0:.1f}s, stars={repo_info.get("stargazersCount","?")}, '
                f'forks={repo_info.get("forksCount","?")})'
            )
        else:
            logger.warning(f'[DataCollector] {full_name}: [1] 失败 ({time.time() - t0:.1f}s)')

        primary_language = (repo_info or {}).get('language') or raw_data.get('language', '')
        all_languages = (repo_info or {}).get('languages', {})
        project_type = GitHubCollector.detect_project_type(raw_data, repo_info)

        extra['detectedLanguage'] = primary_language
        extra['allLanguages'] = all_languages
        extra['projectType'] = project_type
        logger.info(f'[DataCollector] {full_name}: 识别 → 语言={primary_language}, 类型={project_type}')

        # ===== 第二步：README =====
        logger.info(f'[DataCollector] {full_name}: [2] 获取 README...')
        t0 = time.time()
        readme = gh.fetch_readme(full_name)
        if readme:
            extra['readme'] = readme[:8000]
            sources.append('github_readme')
            logger.info(f'[DataCollector] {full_name}: [2] 成功 ({time.time() - t0:.1f}s, {len(readme)} 字符)')
        else:
            logger.warning(f'[DataCollector] {full_name}: [2] 失败 ({time.time() - t0:.1f}s)')

        if gh.rate_limited:
            return self._finalize(full_name, raw_data, extra, sources, collect_start)

        # ===== 第三步：依赖文件 =====
        logger.info(f'[DataCollector] {full_name}: [3] 获取依赖文件...')
        t0 = time.time()
        deps = gh.fetch_dependencies(full_name, primary_language, all_languages)
        if deps:
            extra['dependencies'] = deps
            sources.append('github_dependencies')
            logger.info(f'[DataCollector] {full_name}: [3] 成功 ({time.time() - t0:.1f}s, {list(deps.keys())})')
        else:
            logger.info(f'[DataCollector] {full_name}: [3] 未找到 ({time.time() - t0:.1f}s)')

        if gh.rate_limited:
            return self._finalize(full_name, raw_data, extra, sources, collect_start)

        # ===== 第四步：按类型采集 =====
        step = 4

        if project_type in (PROJECT_TYPE_APPLICATION, PROJECT_TYPE_LIBRARY, PROJECT_TYPE_CLI):
            step = self._collect_step(full_name, step, '部署文件',
                                      gh.fetch_deploy_files, [full_name],
                                      extra, sources, 'deployFiles', 'github_deploy_files')
            if not gh.rate_limited:
                step = self._collect_step(full_name, step, 'CI/CD 状态',
                                          gh.fetch_ci_status, [full_name],
                                          extra, sources, 'ciStatus', 'github_actions')

        if not gh.rate_limited and project_type != PROJECT_TYPE_DOCS:
            step = self._collect_step(full_name, step, 'Releases',
                                      gh.fetch_releases, [full_name],
                                      extra, sources, 'recentReleases', 'github_releases')

        if not gh.rate_limited:
            # 项目结构（文件树）
            default_branch = (repo_info or {}).get('defaultBranch', 'main')
            step = self._collect_step(full_name, step, '项目结构',
                                      gh.fetch_project_structure, [full_name, default_branch],
                                      extra, sources, 'projectStructure', 'github_tree')

        if not gh.rate_limited:
            step = self._collect_step(full_name, step, '热门 Issues',
                                      gh.fetch_issues_topics, [full_name],
                                      extra, sources, 'issuesTopics', 'github_issues')

        if not gh.rate_limited:
            step = self._collect_step(full_name, step, '提交频率',
                                      gh.fetch_commit_frequency, [full_name],
                                      extra, sources, 'commitFrequency', 'github_commits')

        return self._finalize(full_name, raw_data, extra, sources, collect_start)

    # ------------------------------------------------------------------
    # 辅助
    # ------------------------------------------------------------------

    def _collect_step(self, full_name: str, step: int, label: str,
                      fn, args: list, extra: dict, sources: list,
                      extra_key: str, source_name: str) -> int:
        """执行一个采集步骤并记录日志，返回下一步编号"""
        logger.info(f'[DataCollector] {full_name}: [{step}] 获取{label}...')
        t0 = time.time()
        result = fn(*args)
        elapsed = time.time() - t0
        if result:
            extra[extra_key] = result
            sources.append(source_name)
            logger.info(f'[DataCollector] {full_name}: [{step}] {label}成功 ({elapsed:.1f}s)')
        else:
            logger.info(f'[DataCollector] {full_name}: [{step}] {label}未找到 ({elapsed:.1f}s)')
        return step + 1

    def _finalize(self, full_name: str, raw_data: dict, extra: dict,
                  sources: list, collect_start: float) -> dict:
        """全网搜索 + 返回最终结果"""
        if self._github.rate_limited:
            logger.warning(f'[DataCollector] {full_name}: ⚠️ GitHub API 限流，部分数据可能缺失')

        logger.info(f'[DataCollector] {full_name}: [Web] 开始全网搜索...')
        t0 = time.time()
        title = raw_data.get('title', '')
        description = raw_data.get('description', '')
        readme = extra.get('readme', '')
        topics = (extra.get('repoInfo') or {}).get('topics', [])

        articles = self._web.search_articles(full_name, title, description, readme, topics)
        if articles:
            extra['webArticles'] = articles
            sources.append('web_search')
            domains = [a.get('source', '') for a in articles]
            logger.info(f'[DataCollector] {full_name}: [Web] 完成 ({time.time() - t0:.1f}s, {len(articles)} 篇, {domains})')
        else:
            logger.info(f'[DataCollector] {full_name}: [Web] 未找到文章 ({time.time() - t0:.1f}s)')

        # 从 README 中提取图片 URL
        readme = extra.get('readme', '')
        if readme:
            images = self._extract_readme_images(readme, full_name)
            if images:
                extra['readmeImages'] = images
                logger.info(f'[DataCollector] {full_name}: 提取到 {len(images)} 张 README 图片')

        total = time.time() - collect_start
        logger.info(f'[DataCollector] ---- {full_name} 采集完成 (总耗时 {total:.1f}s, 来源={sources}) ----')
        return {'sources': sources, 'extra': extra}

    # ------------------------------------------------------------------
    # README 图片提取
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_readme_images(readme: str, full_name: str) -> list[dict]:
        """从 README Markdown 中提取图片 URL，转换为绝对路径"""
        if not readme:
            return []

        images = []
        seen = set()

        # 匹配 Markdown 图片: ![alt](url)
        md_pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
        # 匹配 HTML img: <img ... src="url" ...>
        html_pattern = r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>'

        raw_base = f'https://raw.githubusercontent.com/{full_name}/HEAD'
        github_base = f'https://github.com/{full_name}/raw/HEAD'

        for alt, url in re.findall(md_pattern, readme):
            url = url.strip()
            if url in seen:
                continue
            seen.add(url)
            abs_url = DataCollector._to_absolute_image_url(url, raw_base, github_base, full_name)
            if abs_url and DataCollector._is_useful_image(abs_url, alt):
                images.append({'url': abs_url, 'alt': alt.strip() or ''})

        for url in re.findall(html_pattern, readme, re.IGNORECASE):
            url = url.strip()
            if url in seen:
                continue
            seen.add(url)
            abs_url = DataCollector._to_absolute_image_url(url, raw_base, github_base, full_name)
            if abs_url and DataCollector._is_useful_image(abs_url, ''):
                images.append({'url': abs_url, 'alt': ''})

        return images[:15]  # 最多 15 张

    @staticmethod
    def _to_absolute_image_url(url: str, raw_base: str, github_base: str, full_name: str) -> str | None:
        """将相对/特殊 URL 转为绝对 URL"""
        if url.startswith(('http://', 'https://')):
            return url
        if url.startswith('//'):
            return 'https:' + url
        if url.startswith('./'):
            url = url[2:]
        if url.startswith('/'):
            url = url[1:]
        # 相对路径 → raw.githubusercontent.com
        return f'{raw_base}/{url}'

    @staticmethod
    def _is_useful_image(url: str, alt: str) -> bool:
        """过滤掉徽章、图标等无意义的小图片"""
        url_lower = url.lower()
        alt_lower = alt.lower()

        # 排除常见徽章服务
        badge_domains = (
            'shields.io', 'badge', 'img.shields', 'travis-ci',
            'codecov.io', 'coveralls.io', 'david-dm.org',
            'snyk.io', 'circleci.com', 'github.com/workflows',
            'npmjs.com', 'pypi.org', 'camo.githubusercontent',
        )
        if any(d in url_lower for d in badge_domains):
            return False

        # 排除 SVG 徽章（但保留 SVG 架构图）
        if url_lower.endswith('.svg') and ('badge' in url_lower or 'shield' in url_lower):
            return False

        # 排除常见徽章 alt 文本
        badge_alts = ('build', 'status', 'coverage', 'license', 'npm', 'pypi', 'version', 'downloads')
        if any(b in alt_lower for b in badge_alts) and len(alt) < 30:
            return False

        return True
