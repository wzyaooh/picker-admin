import itertools
import time
import logging
from abc import ABC, abstractmethod
from typing import Any, Callable

import requests
from fake_useragent import UserAgent

logger = logging.getLogger(__name__)


class CancelledError(Exception):
    """爬虫任务被取消时抛出的异常"""
    pass


class BaseSpider(ABC):
    """爬虫基类"""

    name: str = 'base'

    def __init__(self, config: dict | None = None):
        self.config = config or {}
        self.session = requests.Session()
        self.timeout = self.config.get('timeout', 30)
        self.retry = self.config.get('retry', 3)
        self.delay = self.config.get('delay', 1.0)
        self._cancel_checker: Callable[[], bool] | None = None
        self._cancelled: bool = False
        self._init_proxy()
        self._setup_session()

    def _setup_session(self):
        try:
            ua = UserAgent()
            self.session.headers.update({'User-Agent': ua.random})
        except Exception:
            self.session.headers.update({
                'User-Agent': (
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) '
                    'Chrome/131.0.0.0 Safari/537.36'
                )
            })

    def _init_proxy(self):
        """解析 config 中的代理配置，初始化 proxy cycle。
        优先级：config.proxyList > config.proxy > 环境变量 HTTP_PROXY
        """
        proxy_list = self.config.get('proxyList')
        proxy = self.config.get('proxy')

        # 如果 config 中没有代理，尝试从环境变量读取
        if not proxy_list and not proxy:
            import os
            env_proxy = os.getenv('HTTP_PROXY') or os.getenv('HTTPS_PROXY') or os.getenv('http_proxy') or os.getenv('https_proxy')
            if env_proxy:
                proxy = env_proxy

        if proxy_list and isinstance(proxy_list, list) and len(proxy_list) > 0:
            self._proxy_cycle = itertools.cycle(proxy_list)
        elif proxy and isinstance(proxy, str):
            self._proxy_cycle = itertools.cycle([proxy])
        else:
            self._proxy_cycle = None

    def _get_proxies(self) -> dict | None:
        """从 proxy cycle 获取下一个代理，返回 requests 格式的 proxies dict。"""
        if self._proxy_cycle is None:
            return None
        proxy_url = next(self._proxy_cycle)
        return {'http': proxy_url, 'https': proxy_url}

    def check_cancelled(self) -> bool:
        """检查是否应取消爬取。
        通过 cancel_checker 回调函数实现，由 TaskService 在创建 spider 时注入。
        如果未注入回调，始终返回 False。
        """
        if self._cancelled:
            return True
        if self._cancel_checker:
            result = self._cancel_checker()
            if result:
                logger.info(f'[{self.name}] 检测到取消标志，设置 _cancelled=True')
                self._cancelled = True
        return self._cancelled

    def interruptible_sleep(self, seconds: float) -> None:
        """可中断的 sleep：每秒检查一次取消标志，被取消时立即返回"""
        remaining = seconds
        while remaining > 0:
            chunk = min(remaining, 1.0)
            time.sleep(chunk)
            remaining -= chunk
            if self.check_cancelled():
                logger.info(f'[{self.name}] interruptible_sleep 被取消中断，剩余 {remaining:.1f}s')
                return

    def fetch(self, url: str, method: str = 'GET',
              data: dict | None = None,
              json: dict | None = None) -> requests.Response:
        """带重试的 HTTP 请求。

        Args:
            url: 请求 URL
            method: HTTP 方法，GET 或 POST（不区分大小写）
            data: POST 表单数据
            json: POST JSON 数据

        Raises:
            CancelledError: 任务被取消时抛出
            ValueError: 不支持的 HTTP 方法
        """
        method = method.upper()
        if method not in ('GET', 'POST'):
            raise ValueError(f'不支持的 HTTP 方法: {method}，仅支持 GET 和 POST')

        if self.check_cancelled():
            raise CancelledError(f'任务已取消，跳过请求: {url}')

        for attempt in range(1, self.retry + 1):
            try:
                proxies = self._get_proxies()
                if method == 'GET':
                    resp = self.session.get(url, timeout=self.timeout, proxies=proxies)
                else:
                    resp = self.session.post(url, data=data, json=json, timeout=self.timeout, proxies=proxies)
                resp.raise_for_status()
                return resp
            except requests.RequestException as e:
                logger.warning(f'[{self.name}] Attempt {attempt}/{self.retry} failed for {url}: {e}')
                if attempt == self.retry:
                    raise
                time.sleep(self.delay * attempt)

    @abstractmethod
    def parse(self, url: str) -> list[dict[str, Any]]:
        """解析页面，返回结果列表"""
        ...

    def run(self, url: str) -> list[dict[str, Any]]:
        """执行爬取。捕获 CancelledError 时返回已获取的部分结果。"""
        logger.info(f'[{self.name}] Start crawling: {url}')
        try:
            results = self.parse(url)
        except CancelledError:
            logger.warning(f'[{self.name}] Crawling cancelled for: {url}')
            return []
        logger.info(f'[{self.name}] Finished, got {len(results)} items')
        return results

    def close(self):
        self.session.close()
