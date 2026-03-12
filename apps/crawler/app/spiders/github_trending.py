import logging
import time
from typing import Any

from app.spiders.base import BaseSpider

logger = logging.getLogger(__name__)

GITHUB_API = 'https://api.github.com'


class GithubTrendingSpider(BaseSpider):
    """GitHub AI 热门仓库爬虫 - 采集仓库名称、描述、Star、语言、话题等信息"""

    name = 'github_trending'

    def _setup_session(self):
        super()._setup_session()
        self.session.headers.update({
            'Accept': 'application/vnd.github.v3+json',
        })
        token = self.config.get('token')
        if token:
            self.session.headers.update({
                'Authorization': f'token {token}',
            })

    def parse(self, url: str) -> list[dict[str, Any]]:
        """
        GitHub 趋势仓库搜索。

        config.keywords 支持多种格式：
          - 字符串: "ai"  或  "ai,machine learning,llm"（逗号分隔）
          - 列表:   ["ai", "machine learning", "llm"]
        每个关键词独立搜索，结果合并去重。

        也兼容旧的 config.keyword（单个字符串）。
        """
        # 解析关键词列表
        raw_keywords = self.config.get('keywords') or self.config.get('keyword', 'ai')
        if isinstance(raw_keywords, list):
            keywords = [k.strip() for k in raw_keywords if k.strip()]
        else:
            keywords = [k.strip() for k in str(raw_keywords).split(',') if k.strip()]
        if not keywords:
            keywords = ['ai']

        max_pages = self.config.get('maxPages', 3)
        per_page = self.config.get('perPage', 30)
        sort = self.config.get('sort', 'stars')
        min_stars = self.config.get('minStars', 100)
        language = self.config.get('language')  # 可选：限定编程语言

        all_repos = []
        seen_full_names = set()  # 多关键词去重

        # 预估 API 调用量，给出警告
        search_calls = len(keywords) * max_pages
        has_token = bool(self.config.get('token'))
        search_limit_per_min = 30 if has_token else 10
        if search_calls > search_limit_per_min:
            logger.warning(
                f'[{self.name}] ⚠️ 预估搜索请求 {search_calls} 次 '
                f'(关键词 {len(keywords)} × 页数 {max_pages})，'
                f'超过 GitHub Search API 限制 ({search_limit_per_min}/min)，'
                f'将自动限流等待'
            )

        search_count = 0  # 跟踪搜索请求计数
        search_window_start = time.time()  # 限流窗口起点

        for kw_idx, kw in enumerate(keywords):
            if self.check_cancelled():
                break
            logger.info(f'[{self.name}] 搜索关键词 [{kw_idx + 1}/{len(keywords)}]: "{kw}"')
            for page in range(1, max_pages + 1):
                if self.check_cancelled():
                    break

                # 主动限流：搜索 API 每分钟有独立限制
                search_count += 1
                if search_count >= search_limit_per_min:
                    elapsed = time.time() - search_window_start
                    if elapsed < 62:
                        wait = 62 - elapsed
                        logger.info(f'[{self.name}] 主动限流：已发送 {search_count} 次搜索，等待 {wait:.0f}s')
                        self.interruptible_sleep(wait)
                        if self.check_cancelled():
                            break
                    search_count = 0
                    search_window_start = time.time()

                # 构建查询字符串
                q_parts = [kw, f'stars:>={min_stars}']
                if language:
                    q_parts.append(f'language:{language}')
                q = '+'.join(q_parts)

                api_url = (
                    f'{GITHUB_API}/search/repositories'
                    f'?q={q}'
                    f'&sort={sort}&order=desc'
                    f'&per_page={per_page}&page={page}'
                )
                logger.info(f'[{self.name}] 关键词 "{kw}" 第 {page}/{max_pages} 页: {api_url}')

                resp = self.fetch(api_url)
                data = resp.json()

                items = data.get('items', [])
                if not items:
                    break

                for repo in items:
                    full_name = repo.get('full_name', '')
                    if full_name in seen_full_names:
                        continue
                    seen_full_names.add(full_name)
                    all_repos.append(self._extract_repo(repo))

                # 响应头限流检测
                remaining = int(resp.headers.get('X-RateLimit-Remaining', 10))
                if remaining < 3:
                    reset_time = int(resp.headers.get('X-RateLimit-Reset', 0))
                    wait = max(reset_time - int(time.time()), 1)
                    logger.warning(f'[{self.name}] Rate limit 即将耗尽 ({remaining})，等待 {wait}s')
                    self.interruptible_sleep(wait)
                    if self.check_cancelled():
                        break
                    search_count = 0
                    search_window_start = time.time()
                elif page < max_pages:
                    self.interruptible_sleep(self.delay)

        logger.info(f'[{self.name}] 搜索完成，共 {len(all_repos)} 个仓库（{len(keywords)} 个关键词，搜索请求 {search_count} 次）')

        # 尝试补充 README（限制数量避免 rate limit）
        fetch_readme_limit = min(self.config.get('fetchReadmeLimit', 10), len(all_repos))
        if self.config.get('fetchReadme', False) and not self.check_cancelled():
            logger.info(f'[{self.name}] 补充 README（前 {fetch_readme_limit} 个）')
            for idx, repo in enumerate(all_repos[:fetch_readme_limit]):
                if self.check_cancelled():
                    logger.info(f'[{self.name}] README 获取被取消，已处理 {idx}/{fetch_readme_limit}')
                    break
                logger.debug(f'[{self.name}] 获取 README [{idx+1}/{fetch_readme_limit}]: {repo["fullName"]}')
                readme = self._fetch_readme_raw(repo['fullName'])
                if readme:
                    repo['readme'] = readme
                    repo['readmeSummary'] = self._extract_summary(readme)
                self.interruptible_sleep(self.delay)

        # 补充最新版本号（大量仓库时跳过，避免 rate limit）
        version_limit = len(all_repos) if has_token else min(60, len(all_repos))
        if self.config.get('fetchVersion', True) and not self.check_cancelled():
            if len(all_repos) > version_limit:
                logger.warning(
                    f'[{self.name}] 仓库数 {len(all_repos)} 超过版本查询限制 {version_limit}，'
                    f'仅查询前 {version_limit} 个'
                )
            for idx, repo in enumerate(all_repos[:version_limit]):
                if self.check_cancelled():
                    logger.info(f'[{self.name}] 版本获取被取消，已处理 {idx}/{version_limit}')
                    break
                logger.debug(f'[{self.name}] 获取版本 [{idx+1}/{version_limit}]: {repo["fullName"]}')
                repo['version'] = self._fetch_latest_version(repo['fullName'])
                self.interruptible_sleep(self.delay)

        return all_repos

    def _extract_repo(self, repo: dict) -> dict[str, Any]:
        owner_info = repo.get('owner', {})
        license_info = repo.get('license')

        return {
            'url': repo.get('html_url', ''),
            'fullName': repo.get('full_name', ''),
            'title': repo.get('name', ''),
            'description': repo.get('description', ''),
            'content': repo.get('description', ''),
            'logo': owner_info.get('avatar_url', ''),
            'author': owner_info.get('login', ''),
            'version': None,  # 通过 _fetch_latest_version 补充
            'license': license_info.get('spdx_id') if license_info else None,
            'stars': repo.get('stargazers_count', 0),
            'forks': repo.get('forks_count', 0),
            'watchers': repo.get('subscribers_count', 0),
            'openIssues': repo.get('open_issues_count', 0),
            'language': repo.get('language', ''),
            'topics': repo.get('topics', []),
            'owner': {
                'name': owner_info.get('login', ''),
                'avatar': owner_info.get('avatar_url', ''),
                'url': owner_info.get('html_url', ''),
            },
            'defaultBranch': repo.get('default_branch', 'main'),
            'homepage': repo.get('homepage', ''),
            'archived': repo.get('archived', False),
            'createdAt': repo.get('created_at', ''),
            'updatedAt': repo.get('updated_at', ''),
            'pushedAt': repo.get('pushed_at', ''),
        }

    def _fetch_readme_raw(self, full_name: str) -> str | None:
        """获取完整 README Markdown 内容"""
        try:
            url = f'{GITHUB_API}/repos/{full_name}/readme'
            # 使用 self.fetch() 而不是直接 session.get，这样可以利用重试和超时机制
            # 但需要手动设置 Accept header
            original_accept = self.session.headers.get('Accept')
            self.session.headers.update({
                'Accept': 'application/vnd.github.v3.raw',
            })
            resp = self.fetch(url)
            # 恢复原来的 Accept header
            if original_accept:
                self.session.headers.update({'Accept': original_accept})
            return resp.text
        except Exception as e:
            logger.debug(f'[{self.name}] Failed to fetch README for {full_name}: {e}')
            return None

    @staticmethod
    def _extract_summary(markdown: str, max_len: int = 300) -> str:
        """从 Markdown 中提取纯文本摘要"""
        import re
        text = markdown
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', text)
        text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)
        text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
        text = re.sub(r'```[\s\S]*?```', '', text)
        text = re.sub(r'`[^`]*`', '', text)
        text = re.sub(r'\*{1,3}([^*]*)\*{1,3}', r'\1', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = text.strip()
        if len(text) > max_len:
            text = text[:max_len] + '...'
        return text

    def _fetch_latest_version(self, full_name: str) -> str | None:
        """获取仓库最新 release 版本号"""
        try:
            url = f'{GITHUB_API}/repos/{full_name}/releases/latest'
            resp = self.fetch(url)
            return resp.json().get('tag_name')
        except Exception as e:
            logger.debug(f'[{self.name}] Failed to fetch latest release for {full_name}: {e}')
            return None
