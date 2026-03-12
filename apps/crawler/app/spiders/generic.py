import logging
from typing import Any

from bs4 import BeautifulSoup

from app.spiders.base import BaseSpider

logger = logging.getLogger(__name__)


class GenericSpider(BaseSpider):
    """通用网页爬虫 - 提取标题、正文、链接等基础信息"""

    name = 'generic'

    def parse(self, url: str) -> list[dict[str, Any]]:
        resp = self.fetch(url)
        resp.encoding = resp.apparent_encoding
        soup = BeautifulSoup(resp.text, 'lxml')

        title = soup.title.string.strip() if soup.title and soup.title.string else ''

        # 获取配置参数
        max_links = self.config.get('maxLinks', 50)
        max_images = self.config.get('maxImages', 50)
        extract_content = self.config.get('extractContent', True)
        extract_links = self.config.get('extractLinks', True)
        extract_images = self.config.get('extractImages', True)

        result = {
            'title': title,
            'url': url,
        }

        # 根据配置提取正文段落
        if extract_content:
            paragraphs = [p.get_text(strip=True) for p in soup.find_all('p') if p.get_text(strip=True)]
            result['content'] = '\n'.join(paragraphs)
        else:
            result['content'] = ''

        # 根据配置提取链接
        if extract_links:
            links = []
            for a in soup.find_all('a', href=True):
                href = a['href']
                text = a.get_text(strip=True)
                if href.startswith(('http://', 'https://')):
                    links.append({'url': href, 'text': text})
            result['links'] = links[:max_links]
        else:
            result['links'] = []

        # 根据配置提取图片
        if extract_images:
            images = []
            for img in soup.find_all('img', src=True):
                src = img['src']
                alt = img.get('alt', '')
                if src.startswith(('http://', 'https://')):
                    images.append({'src': src, 'alt': alt})
            result['images'] = images[:max_images]
        else:
            result['images'] = []

        return [result]
