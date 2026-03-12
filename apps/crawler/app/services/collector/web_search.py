"""
全网搜索：多引擎调度、反检测、文章评分、正文抓取
"""
import logging
import random
import re
import time
from urllib.parse import unquote, urlparse

import requests
from bs4 import BeautifulSoup

from .constants import QUALITY_DOMAINS, SKIP_DOMAINS, USER_AGENTS

logger = logging.getLogger(__name__)


class WebSearchCollector:
    """全网搜索采集器（独立 session，反检测）"""

    def __init__(self):
        self._session: requests.Session | None = None
        self.timeout = 15

    def close(self):
        if self._session:
            try:
                self._session.close()
            except Exception:
                pass

    # ------------------------------------------------------------------
    # Session 管理
    # ------------------------------------------------------------------

    def _get_session(self) -> requests.Session:
        if self._session is None:
            self._session = self._create_session()
        return self._session

    def _create_session(self) -> requests.Session:
        s = requests.Session()
        ua = random.choice(USER_AGENTS)
        s.headers.update({
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        })
        logger.debug(f'[WebSearch] 创建新 session (UA: ...{ua[-30:]})')
        return s

    def _rotate_session(self):
        if self._session:
            try:
                self._session.close()
            except Exception:
                pass
        self._session = self._create_session()
        logger.debug('[WebSearch] session 已轮换')

    # ------------------------------------------------------------------
    # 别名提取 & 搜索关键词构建
    # ------------------------------------------------------------------

    @staticmethod
    def extract_aliases(readme: str, title: str) -> list[str]:
        """从 README 中提取项目别名/昵称"""
        aliases = []
        if not readme:
            return aliases

        head = readme[:2000]
        patterns = [
            r'(?:aka|a\.k\.a\.?|also known as|又名|又称|简称|昵称|别名|俗称)\s*[：:)）]?\s*[「"\'【]?(\S+?)[」"\'】]?[\s,，。.)）]',
            rf'{re.escape(title)}\s*[\(（]\s*(.+?)\s*[\)）]',
        ]
        for pat in patterns:
            for m in re.finditer(pat, head, re.IGNORECASE):
                alias = m.group(1).strip()
                if alias and alias.lower() != title.lower() and len(alias) < 30:
                    aliases.append(alias)

        if title and re.match(r'^[a-zA-Z]', title):
            m = re.search(
                rf'#\s*{re.escape(title)}\s*[-|—]\s*([\u4e00-\u9fff][\u4e00-\u9fff\w]*)',
                head,
            )
            if m:
                aliases.append(m.group(1))

        seen = set()
        unique = []
        for a in aliases:
            if a.lower() not in seen:
                seen.add(a.lower())
                unique.append(a)
        return unique[:3]

    @staticmethod
    def build_search_queries(full_name: str, title: str, description: str,
                             readme: str, topics: list) -> list[str]:
        """构建多组搜索关键词"""
        queries = []
        repo_name = full_name.split('/')[-1] if '/' in full_name else full_name
        desc_short = (description or '')[:50].strip()

        aliases = WebSearchCollector.extract_aliases(readme, title or repo_name)
        if aliases:
            logger.info(f'[WebSearch] {full_name}: 检测到别名: {aliases}')

        queries.append(f'"{repo_name}" review OR tutorial OR guide OR 教程 OR 评测')
        if desc_short:
            queries.append(f'{repo_name} {desc_short} introduction OR getting started')
        for alias in aliases[:2]:
            queries.append(f'"{alias}" {repo_name} OR {full_name}')
        queries.append(f'{repo_name} 使用教程 OR 入门指南 OR 深度解析 OR 实战')

        meaningful_topics = [t for t in (topics or []) if len(t) > 2 and t not in ('python', 'javascript', 'go', 'rust')]
        if meaningful_topics:
            topic_str = ' '.join(meaningful_topics[:3])
            queries.append(f'{repo_name} {topic_str} best practices OR comparison')

        return queries

    # ------------------------------------------------------------------
    # 多策略搜索主流程
    # ------------------------------------------------------------------

    def search_articles(self, full_name: str, title: str, description: str,
                        readme: str, topics: list) -> list | None:
        """多策略搜索，采集候选文章后评分排序，返回最佳结果"""
        queries = self.build_search_queries(full_name, title, description, readme, topics)
        logger.info(f'[WebSearch] {full_name}: 共 {len(queries)} 组搜索关键词')

        all_candidates = []
        seen_urls = set()
        consecutive_failures = 0

        for idx, query in enumerate(queries, 1):
            if consecutive_failures >= 3:
                logger.warning(f'[WebSearch] {full_name}: 连续 {consecutive_failures} 次搜索失败，停止')
                break

            logger.debug(f'[WebSearch] {full_name}: 搜索 [{idx}/{len(queries)}] "{query[:60]}..."')
            results = self._web_search(query)

            if not results:
                consecutive_failures += 1
                time.sleep(random.uniform(2.0, 4.0))
                continue

            consecutive_failures = 0

            for item in results:
                url = item.get('url', '')
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                domain = self._get_domain(url)
                if any(skip in domain for skip in SKIP_DOMAINS):
                    continue
                all_candidates.append({**item, 'source': domain, 'query_idx': idx})

            if len(all_candidates) >= 15:
                break

            time.sleep(random.uniform(1.0, 3.0))

        if not all_candidates:
            return None

        logger.info(f'[WebSearch] {full_name}: 共收集 {len(all_candidates)} 篇候选，开始评分...')

        repo_name = (full_name.split('/')[-1] if '/' in full_name else full_name).lower()
        scored = sorted(
            [(self._score_article(c, repo_name, title), c) for c in all_candidates],
            key=lambda x: -x[0],
        )

        final_articles = []
        for score, candidate in scored[:10]:
            domain = candidate['source']
            if sum(1 for a in final_articles if a['source'] == domain) >= 2:
                continue

            content = self._fetch_article_content(candidate['url'])
            if not content or len(content) < 100:
                continue

            content_lower = content.lower()
            if repo_name not in content_lower and (not title or title.lower() not in content_lower):
                if len(final_articles) >= 3:
                    continue

            final_articles.append({
                'title': candidate['title'],
                'url': candidate['url'],
                'snippet': candidate.get('snippet', ''),
                'content': content[:2500],
                'source': domain,
                'score': score,
            })
            if len(final_articles) >= 6:
                break

        if final_articles:
            logger.info(f'[WebSearch] {full_name}: 精选 {len(final_articles)} 篇 (评分: {[a["score"] for a in final_articles]})')
        return final_articles if final_articles else None

    # ------------------------------------------------------------------
    # 搜索引擎调度（Brave → DuckDuckGo）
    # ------------------------------------------------------------------

    def _web_search(self, query: str) -> list | None:
        results = self._brave_search(query)
        if results:
            return results
        return self._ddg_search(query)

    def _brave_search(self, query: str, retry: int = 0) -> list | None:
        session = self._get_session()
        try:
            resp = session.get(
                'https://search.brave.com/search',
                params={'q': query, 'source': 'web'},
                timeout=self.timeout,
            )

            if resp.status_code in (403, 429):
                logger.debug(f'[WebSearch] Brave 返回 {resp.status_code}，轮换 session...')
                if retry < 1:
                    self._rotate_session()
                    time.sleep(random.uniform(2.0, 5.0))
                    return self._brave_search(query, retry=retry + 1)
                logger.warning('[WebSearch] Brave 重试后仍被封')
                return None

            if resp.status_code != 200:
                logger.debug(f'[WebSearch] Brave 返回 {resp.status_code}')
                return None

            body_head = resp.text[:1000].lower()
            if any(kw in body_head for kw in ('captcha', 'are you a robot', 'verify you are human', 'challenge')):
                logger.debug('[WebSearch] Brave 触发人机验证')
                if retry < 1:
                    self._rotate_session()
                    time.sleep(random.uniform(3.0, 6.0))
                    return self._brave_search(query, retry=retry + 1)
                return None

            soup = BeautifulSoup(resp.text, 'lxml')
            results = soup.select('.snippet[data-type="web"]')
            if not results:
                results = soup.select('#results .snippet') or soup.select('.fdb')
            if not results:
                logger.debug('[WebSearch] Brave 未返回 web 结果')
                return None

            items = []
            for r in results:
                title_el = r.select_one('.title') or r.select_one('a .title') or r.select_one('.snippet-title')
                link_el = r.select_one('a[href^="http"]')
                desc_el = r.select_one('.snippet-description') or r.select_one('.snippet-content') or r.select_one('.generic-snippet')
                if not link_el:
                    continue
                href = link_el.get('href', '')
                if not href.startswith('http'):
                    continue
                items.append({
                    'title': title_el.get_text(strip=True) if title_el else '',
                    'url': href,
                    'snippet': desc_el.get_text(strip=True)[:300] if desc_el else '',
                })
            return items if items else None

        except Exception as e:
            logger.debug(f'[WebSearch] Brave 异常: {type(e).__name__}: {e}')
            return None

    def _ddg_search(self, query: str) -> list | None:
        session = self._get_session()
        try:
            resp = session.post(
                'https://html.duckduckgo.com/html/',
                data={'q': query, 'b': ''},
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': 'https://html.duckduckgo.com/',
                },
                timeout=self.timeout,
            )
            if resp.status_code not in (200, 202):
                logger.debug(f'[WebSearch] DuckDuckGo 返回 {resp.status_code}')
                return None

            body_head = resp.text[:500].lower()
            if any(kw in body_head for kw in ('bots', 'captcha', 'blocked', 'unusual traffic')):
                logger.debug('[WebSearch] DuckDuckGo 触发验证码')
                return None

            soup = BeautifulSoup(resp.text, 'lxml')
            items = []
            for result in soup.select('.result__body'):
                link_el = result.select_one('.result__a')
                snippet_el = result.select_one('.result__snippet')
                if not link_el:
                    continue
                href = link_el.get('href', '')
                real_url = self._extract_ddg_url(href)
                if not real_url:
                    continue
                items.append({
                    'title': link_el.get_text(strip=True),
                    'url': real_url,
                    'snippet': snippet_el.get_text(strip=True) if snippet_el else '',
                })
            return items if items else None

        except Exception as e:
            logger.debug(f'[WebSearch] DuckDuckGo 异常: {type(e).__name__}: {e}')
            return None

    # ------------------------------------------------------------------
    # 评分 & 工具
    # ------------------------------------------------------------------

    @staticmethod
    def _score_article(candidate: dict, repo_name: str, title: str) -> int:
        score = 0
        c_title = (candidate.get('title') or '').lower()
        c_snippet = (candidate.get('snippet') or '').lower()
        domain = candidate.get('source', '')
        text = c_title + ' ' + c_snippet

        if repo_name in c_title:
            score += 30
        elif repo_name in c_snippet:
            score += 15
        if title and title.lower() in text:
            score += 10
        if any(qd in domain for qd in QUALITY_DOMAINS):
            score += 20

        content_signals = {
            'tutorial': 15, '教程': 15, 'guide': 12, '指南': 12,
            'review': 12, '评测': 12, '深度': 10, 'deep dive': 10,
            'getting started': 10, '入门': 10, '实战': 10,
            'comparison': 8, '对比': 8, 'vs': 8,
            'best practices': 8, '最佳实践': 8,
            'introduction': 6, '介绍': 6,
        }
        for keyword, pts in content_signals.items():
            if keyword in text:
                score += pts
                break

        if candidate.get('query_idx') == 1:
            score += 5
        if 50 < len(c_snippet) < 500:
            score += 5
        return score

    @staticmethod
    def _extract_ddg_url(href: str) -> str | None:
        if not href:
            return None
        match = re.search(r'uddg=([^&]+)', href)
        if match:
            return unquote(match.group(1))
        return href if href.startswith('http') else None

    @staticmethod
    def _get_domain(url: str) -> str:
        try:
            return urlparse(url).netloc.lower()
        except Exception:
            return ''

    def _fetch_article_content(self, url: str) -> str | None:
        session = self._get_session()
        try:
            resp = session.get(url, timeout=10)
            if resp.status_code != 200:
                return None

            soup = BeautifulSoup(resp.text, 'lxml')
            for tag in soup.select('script, style, nav, header, footer, aside, .sidebar, .ad, .advertisement, .comments'):
                tag.decompose()

            main = (
                soup.select_one('article')
                or soup.select_one('main')
                or soup.select_one('.post-content')
                or soup.select_one('.entry-content')
                or soup.select_one('.article-content')
                or soup.select_one('.markdown-body')
                or soup.select_one('#content')
            )
            text = main.get_text(separator='\n', strip=True) if main else ''
            if not text:
                body = soup.select_one('body')
                text = body.get_text(separator='\n', strip=True) if body else ''

            lines = [l.strip() for l in text.splitlines() if l.strip()]
            return '\n'.join(lines[:100])

        except Exception as e:
            logger.debug(f'[WebSearch] 文章抓取失败 {url}: {type(e).__name__}: {e}')
            return None
