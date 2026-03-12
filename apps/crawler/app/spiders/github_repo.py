import logging
import re
from typing import Any

from app.spiders.base import BaseSpider

logger = logging.getLogger(__name__)

GITHUB_API = 'https://api.github.com'


class GithubRepoSpider(BaseSpider):
    """GitHub 单仓库爬虫 - 采集指定仓库的详细信息（元数据、README、Release、语言、贡献者等）"""

    name = 'github_repo'

    def _setup_session(self):
        super()._setup_session()
        self.session.headers.update({
            'Accept': 'application/vnd.github.v3+json',
        })
        token = self.config.get('githubToken') or self.config.get('token')
        if token:
            self.session.headers.update({
                'Authorization': f'token {token}',
            })

    def _parse_owner_repo(self, url: str) -> tuple[str, str]:
        """从 GitHub URL 或 owner/repo 格式中提取 owner 和 repo"""
        # 支持格式：
        #   https://github.com/owner/repo
        #   https://github.com/owner/repo/...
        #   owner/repo
        url = url.strip().rstrip('/')
        match = re.match(r'(?:https?://github\.com/)?([^/]+)/([^/]+)', url)
        if not match:
            raise ValueError(f'无法解析 GitHub 仓库地址: {url}')
        return match.group(1), match.group(2)

    def parse(self, url: str) -> list[dict[str, Any]]:
        owner, repo = self._parse_owner_repo(url)
        full_name = f'{owner}/{repo}'
        logger.info(f'[{self.name}] 开始采集仓库: {full_name}')

        # 1. 仓库基本信息
        repo_data = self._fetch_repo_info(full_name)
        if not repo_data:
            raise ValueError(f'仓库不存在或无法访问: {full_name}')

        result = self._extract_repo(repo_data)
        self.interruptible_sleep(self.delay)

        # 2. README
        if self.check_cancelled():
            return [result]
        readme = self._fetch_readme(full_name)
        if readme:
            result['readme'] = readme
            # 提取纯文本摘要（去掉 markdown 标记，取前 300 字符）
            result['readmeSummary'] = self._extract_summary(readme)
        self.interruptible_sleep(self.delay)

        # 3. 语言分布
        if self.check_cancelled():
            return [result]
        result['languages'] = self._fetch_languages(full_name)
        self.interruptible_sleep(self.delay)

        # 4. 最新 Release
        if self.check_cancelled():
            return [result]
        release = self._fetch_latest_release(full_name)
        if release:
            result['version'] = release.get('tag_name')
            result['releaseNote'] = (release.get('body') or '')[:1000]
            result['releaseDate'] = release.get('published_at')
        self.interruptible_sleep(self.delay)

        # 5. 贡献者 Top N
        if self.check_cancelled():
            return [result]
        max_contributors = self.config.get('maxContributors', 10)
        result['contributors'] = self._fetch_contributors(full_name, max_contributors)
        self.interruptible_sleep(self.delay)

        # 6. 最近 Commits
        if self.check_cancelled():
            return [result]
        max_commits = self.config.get('maxCommits', 10)
        result['recentCommits'] = self._fetch_recent_commits(full_name, max_commits)

        logger.info(f'[{self.name}] 仓库 {full_name} 采集完成')
        return [result]

    def _fetch_repo_info(self, full_name: str) -> dict | None:
        try:
            resp = self.fetch(f'{GITHUB_API}/repos/{full_name}')
            return resp.json()
        except Exception as e:
            logger.error(f'[{self.name}] 获取仓库信息失败 {full_name}: {e}')
            return None

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
            'version': None,
            'license': license_info.get('spdx_id') if license_info else None,
            'stars': repo.get('stargazers_count', 0),
            'forks': repo.get('forks_count', 0),
            'watchers': repo.get('subscribers_count', 0),
            'openIssues': repo.get('open_issues_count', 0),
            'language': repo.get('language', ''),
            'topics': repo.get('topics', []),
            'size': repo.get('size', 0),
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

    def _fetch_readme(self, full_name: str) -> str | None:
        """获取完整 README Markdown 内容"""
        try:
            resp = self.session.get(
                f'{GITHUB_API}/repos/{full_name}/readme',
                timeout=self.timeout,
                headers={'Accept': 'application/vnd.github.v3.raw'},
            )
            if resp.status_code == 200:
                return resp.text
        except Exception as e:
            logger.debug(f'[{self.name}] 获取 README 失败 {full_name}: {e}')
        return None

    @staticmethod
    def _extract_summary(markdown: str, max_len: int = 300) -> str:
        """从 Markdown 中提取纯文本摘要"""
        import re
        text = markdown
        # 去掉 HTML 标签
        text = re.sub(r'<[^>]+>', '', text)
        # 去掉图片 ![alt](url)
        text = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', text)
        # 去掉链接保留文字 [text](url) → text
        text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)
        # 去掉标题标记
        text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
        # 去掉代码块
        text = re.sub(r'```[\s\S]*?```', '', text)
        # 去掉行内代码
        text = re.sub(r'`[^`]*`', '', text)
        # 去掉加粗/斜体标记
        text = re.sub(r'\*{1,3}([^*]*)\*{1,3}', r'\1', text)
        # 去掉多余空行
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = text.strip()
        if len(text) > max_len:
            text = text[:max_len] + '...'
        return text

    def _fetch_languages(self, full_name: str) -> dict[str, int]:
        """获取语言分布（字节数）"""
        try:
            resp = self.fetch(f'{GITHUB_API}/repos/{full_name}/languages')
            return resp.json()
        except Exception as e:
            logger.debug(f'[{self.name}] 获取语言分布失败 {full_name}: {e}')
            return {}

    def _fetch_latest_release(self, full_name: str) -> dict | None:
        """获取最新 Release"""
        try:
            resp = self.session.get(
                f'{GITHUB_API}/repos/{full_name}/releases/latest',
                timeout=self.timeout,
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception as e:
            logger.debug(f'[{self.name}] 获取 Release 失败 {full_name}: {e}')
        return None

    def _fetch_contributors(self, full_name: str, limit: int = 10) -> list[dict]:
        """获取贡献者列表"""
        try:
            resp = self.fetch(f'{GITHUB_API}/repos/{full_name}/contributors?per_page={limit}')
            contributors = resp.json()
            return [
                {
                    'login': c.get('login'),
                    'avatar': c.get('avatar_url'),
                    'contributions': c.get('contributions'),
                    'url': c.get('html_url'),
                }
                for c in contributors[:limit]
            ]
        except Exception as e:
            logger.debug(f'[{self.name}] 获取贡献者失败 {full_name}: {e}')
            return []

    def _fetch_recent_commits(self, full_name: str, limit: int = 10) -> list[dict]:
        """获取最近提交"""
        try:
            resp = self.fetch(f'{GITHUB_API}/repos/{full_name}/commits?per_page={limit}')
            commits = resp.json()
            return [
                {
                    'sha': c.get('sha', '')[:7],
                    'message': (c.get('commit', {}).get('message') or '').split('\n')[0][:100],
                    'author': c.get('commit', {}).get('author', {}).get('name'),
                    'date': c.get('commit', {}).get('author', {}).get('date'),
                }
                for c in commits[:limit]
            ]
        except Exception as e:
            logger.debug(f'[{self.name}] 获取提交记录失败 {full_name}: {e}')
            return []
