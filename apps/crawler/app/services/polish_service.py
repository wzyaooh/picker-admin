import logging
import time
import threading

from app.models.article import GeneratedArticle
from app.models.result import CrawlResult
from app.models.enriched_result import EnrichedResult
from app.services.collector import DataCollector
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)


def _compute_data_diff(old_extra: dict, new_extra: dict) -> dict:
    """对比新旧采集数据，生成人可读的差异"""
    diff = {}

    # star/fork 变化
    old_repo = old_extra.get('repoInfo', {}) or {}
    new_repo = new_extra.get('repoInfo', {}) or {}
    old_stars = old_repo.get('stargazersCount', 0)
    new_stars = new_repo.get('stargazersCount', 0)
    if new_stars != old_stars:
        diff['stars'] = {'old': old_stars, 'new': new_stars, 'delta': new_stars - old_stars}
    old_forks = old_repo.get('forksCount', 0)
    new_forks = new_repo.get('forksCount', 0)
    if new_forks != old_forks:
        diff['forks'] = {'old': old_forks, 'new': new_forks, 'delta': new_forks - old_forks}

    # 新增 release
    old_tags = {r.get('tagName', '') for r in (old_extra.get('recentReleases') or [])}
    new_releases = [r for r in (new_extra.get('recentReleases') or [])
                    if r.get('tagName', '') and r['tagName'] not in old_tags]
    if new_releases:
        diff['newReleases'] = [
            {'tagName': r.get('tagName'), 'name': r.get('name', ''), 'publishedAt': r.get('publishedAt', '')}
            for r in new_releases[:5]
        ]

    # 新增 web 文章
    old_urls = {a.get('url', '') for a in (old_extra.get('webArticles') or [])}
    new_articles = [a for a in (new_extra.get('webArticles') or [])
                    if a.get('url', '') and a['url'] not in old_urls]
    if new_articles:
        diff['newWebArticles'] = [
            {'title': a.get('title', ''), 'url': a.get('url', ''), 'source': a.get('source', '')}
            for a in new_articles[:5]
        ]

    # README 长度变化
    old_readme_len = len(old_extra.get('readme', '') or '')
    new_readme_len = len(new_extra.get('readme', '') or '')
    if abs(new_readme_len - old_readme_len) > 200:
        diff['readmeChanged'] = {'oldLength': old_readme_len, 'newLength': new_readme_len}

    # 新增 README 图片
    old_images = {img.get('url', '') for img in (old_extra.get('readmeImages') or [])}
    new_images = [img for img in (new_extra.get('readmeImages') or [])
                  if img.get('url', '') and img['url'] not in old_images]
    if new_images:
        diff['newReadmeImages'] = new_images[:5]

    # commit 活跃度
    old_freq = old_extra.get('commitFrequency', {}) or {}
    new_freq = new_extra.get('commitFrequency', {}) or {}
    if new_freq.get('lastCommitDate') != old_freq.get('lastCommitDate'):
        diff['commitUpdate'] = {
            'oldLastCommit': old_freq.get('lastCommitDate', ''),
            'newLastCommit': new_freq.get('lastCommitDate', ''),
        }

    if not diff:
        diff['noChanges'] = True
        diff['message'] = '项目数据无明显变化，请聚焦于：补充技术细节、增加图表和代码示例、优化语言表达、消除 AI 套话'

    return diff


def _humanize_data_diff(diff: dict) -> str:
    """将 data_diff 转为人可读的文本摘要，避免 LLM 把原始 JSON 搬进文章"""
    if diff.get('noChanges'):
        return diff.get('message', '项目数据无明显变化。')

    parts = []

    stars = diff.get('stars')
    if stars:
        parts.append(f"⭐ Star 数从 {stars['old']} 变为 {stars['new']}（{'增加' if stars['delta'] > 0 else '减少'} {abs(stars['delta'])}）")

    forks = diff.get('forks')
    if forks:
        parts.append(f"🍴 Fork 数从 {forks['old']} 变为 {forks['new']}（{'增加' if forks['delta'] > 0 else '减少'} {abs(forks['delta'])}）")

    releases = diff.get('newReleases')
    if releases:
        tags = '、'.join(r.get('tagName', '') for r in releases)
        parts.append(f"📦 新增 Release 版本：{tags}")

    articles = diff.get('newWebArticles')
    if articles:
        titles = '、'.join(f"《{a.get('title', '')}》({a.get('source', '')})" for a in articles)
        parts.append(f"📰 新增全网文章：{titles}")

    readme = diff.get('readmeChanged')
    if readme:
        parts.append(f"📝 README 长度从 {readme['oldLength']} 变为 {readme['newLength']} 字符")

    images = diff.get('newReadmeImages')
    if images:
        parts.append(f"🖼️ 新增 {len(images)} 张 README 图片")

    commit = diff.get('commitUpdate')
    if commit:
        parts.append(f"🔄 最新 commit 从 {commit.get('oldLastCommit', '未知')} 更新到 {commit.get('newLastCommit', '未知')}")

    return '\n'.join(parts) if parts else '项目数据无明显变化。'


class PolishService:
    """文章润色服务：重新采集数据 → 对比差异 → LLM 润色 → 保存新版本"""

    @staticmethod
    def _get_github_token(task_id: str) -> str | None:
        """从任务配置或全局配置中获取 GitHub token"""
        from app.models.task import CrawlTask
        task = CrawlTask.find_by_id(task_id)
        if task and task.config:
            token = task.config.get('githubToken')
            if token:
                return token
        from flask import current_app
        return current_app.config.get('GITHUB_TOKEN') or None

    @staticmethod
    def polish(article_id: str, custom_instructions: str = '') -> GeneratedArticle | dict:
        """对指定文章执行润色，生成新版本"""
        start_time = time.time()

        # 1. 查找文章
        article = GeneratedArticle.find_by_id(article_id)
        if not article:
            return {'error': '文章不存在'}
        if article.status != 'success':
            return {'error': '只能润色状态为 success 的文章'}
        if not article.content:
            return {'error': '文章内容为空，无法润色'}

        title_hint = article.title or article_id[:12]
        logger.info(f'[Polish] ========== 开始润色: {title_hint} (v{article.version}) ==========')

        # 确定 group_id（兼容旧数据：如果为空则设为自身 id 并写入 DB）
        group_id = article.group_id or article.id
        if not article.group_id:
            article.group_id = group_id
            article._col().update_one(
                {'_id': article._id},
                {'$set': {'group_id': group_id, 'is_latest': True, 'version': 1}},
            )

        # 2. 查找关联的爬取结果和增强结果
        crawl_result = CrawlResult.find_by_id(article.result_id) if article.result_id else None
        enriched = EnrichedResult.find_by_result_id(article.result_id) if article.result_id else None

        raw_data = crawl_result.raw_data if crawl_result and crawl_result.raw_data else {}
        analysis_result = enriched.to_dict() if enriched else {}

        # 3. 创建新版本记录（processing 状态）
        new_article = GeneratedArticle(
            result_id=article.result_id,
            task_id=article.task_id,
            enriched_id=article.enriched_id,
            title=article.title,
            project_name=article.project_name,
            project_url=article.project_url,
            category=article.category,
            tags=article.tags,
            article_type=article.article_type,
            version=article.version + 1,
            parent_id=article.id,
            group_id=group_id,
            is_latest=False,  # 先不设为最新，成功后再切换
            status='processing',
        )
        new_article.save()
        logger.info(f'[Polish] {title_hint}: 新版本 v{new_article.version} 已创建 (id={new_article.id})')

        try:
            # 4. 重新采集项目最新数据
            extra_data = {}
            old_extra = {}
            if raw_data.get('fullName'):
                logger.info(f'[Polish] {title_hint}: [1/3] 重新采集项目数据...')
                t0 = time.time()
                collector = DataCollector(
                    token=PolishService._get_github_token(article.task_id)
                )
                try:
                    collected = collector.collect(raw_data)
                    extra_data = collected.get('extra', {})
                except Exception as e:
                    logger.warning(f'[Polish] {title_hint}: 数据采集失败: {e}，将使用空 diff 继续润色')
                finally:
                    collector.close()
                logger.info(f'[Polish] {title_hint}: [1/3] 数据采集完成 ({time.time() - t0:.1f}s)')

                # 从 enriched 中提取旧的 extra 数据用于对比
                if enriched:
                    enriched_dict = enriched.to_dict() if not isinstance(analysis_result, dict) else analysis_result
                    community = enriched_dict.get('communityHealth', {}) or {}
                    old_extra = {
                        'repoInfo': {
                            'stargazersCount': community.get('overallScore', 0),
                            'forksCount': 0,
                        },
                        'recentReleases': [],
                        'webArticles': [
                            {'url': ref.get('url', ''), 'title': ref.get('title', '')}
                            for ref in (enriched_dict.get('webReferences') or [])
                        ],
                        'readme': '',
                        'readmeImages': [],
                        'commitFrequency': {},
                    }
                    # 尝试从原始 enriched 的 raw_response 中恢复更准确的旧数据
                    # 如果没有，diff 会倾向于显示"有新数据"，这是合理的
            else:
                logger.info(f'[Polish] {title_hint}: 无 fullName，跳过数据采集')

            # 5. 计算数据差异
            logger.info(f'[Polish] {title_hint}: [2/3] 计算数据差异...')
            data_diff = _compute_data_diff(old_extra, extra_data)
            logger.info(f'[Polish] {title_hint}: [2/3] diff keys: {list(data_diff.keys())}')

            # 6. 调用 LLM 润色
            logger.info(f'[Polish] {title_hint}: [3/3] 调用 LLM 润色...')
            t0 = time.time()
            result = LLMService.polish_article(
                original_content=article.content,
                data_diff=_humanize_data_diff(data_diff),
                extra_data=extra_data,
                analysis_result=analysis_result,
                article_type=article.article_type,
                custom_instructions=custom_instructions,
            )
            logger.info(f'[Polish] {title_hint}: [3/3] LLM 润色完成 ({time.time() - t0:.1f}s, tokens={result["tokens_used"]})')

            # 7. 更新新版本记录
            new_article.content = result['content']
            new_article.word_count = len(result['content'])
            new_article.polish_summary = result['polish_summary']
            new_article.data_diff = data_diff
            new_article.model = result['model']
            new_article.tokens_used = result['tokens_used']
            new_article.status = 'success'
            new_article.error_msg = None
            new_article.save()

            # 8. 切换最新版本标记
            GeneratedArticle.set_latest(new_article.id, group_id)

            elapsed = time.time() - start_time
            logger.info(
                f'[Polish] ========== {title_hint} 润色完成 '
                f'(v{article.version} → v{new_article.version}, '
                f'耗时 {elapsed:.1f}s, tokens={result["tokens_used"]}) =========='
            )
            return new_article

        except Exception as e:
            new_article.status = 'failed'
            new_article.error_msg = str(e)[:500]
            new_article.save()
            logger.error(
                f'[Polish] ========== {title_hint} 润色失败 ==========\n'
                f'  错误: {type(e).__name__}: {str(e)[:300]}',
                exc_info=True,
            )
            return {'error': f'润色失败: {str(e)[:200]}'}

    @staticmethod
    def polish_async(article_id: str, app, custom_instructions: str = '') -> dict:
        """异步执行润色"""
        from app.extensions import redis_client

        running_key = f'crawler:polish_running:{article_id}'

        if redis_client.exists(running_key):
            return {'error': '该文章正在润色中'}

        # 预检查
        article = GeneratedArticle.find_by_id(article_id)
        if not article:
            return {'error': '文章不存在'}
        if article.status != 'success':
            return {'error': '只能润色状态为 success 的文章'}

        redis_client.setex(running_key, 3600, '1')

        def _run():
            try:
                with app.app_context():
                    PolishService.polish(article_id, custom_instructions=custom_instructions)
            finally:
                redis_client.delete(running_key)

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()
        return {'message': '润色已开始', 'articleId': article_id}

    @staticmethod
    def is_polishing(article_id: str) -> bool:
        """检查文章是否正在润色中"""
        from app.extensions import redis_client
        return bool(redis_client.exists(f'crawler:polish_running:{article_id}'))

    @staticmethod
    def get_polish_status(article_id: str) -> dict:
        """获取润色状态"""
        polishing = PolishService.is_polishing(article_id)
        article = GeneratedArticle.find_by_id(article_id)
        group_id = article.group_id or article.id if article else ''

        # 检查是否有 processing 状态的新版本
        if group_id:
            from app.extensions import mongo_db
            processing = mongo_db['generated_article'].find_one(
                {'group_id': group_id, 'status': 'processing'},
            )
            if processing:
                return {'polishing': True, 'newVersionId': str(processing['_id'])}

        return {'polishing': polishing}
