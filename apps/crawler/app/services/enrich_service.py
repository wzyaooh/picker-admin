import logging

from app.models.result import CrawlResult
from app.models.enriched_result import EnrichedResult
from app.models.article import GeneratedArticle
from app.services.collector import DataCollector
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)


class _EnrichCancelled(Exception):
    """单条增强被用户取消"""
    pass


def _safe_list(val) -> list:
    return val if isinstance(val, list) else []


def _safe_dict(val) -> dict:
    return val if isinstance(val, dict) else {}


def _compute_community_health(raw_data: dict, extra_data: dict) -> dict:
    """基于采集数据计算社区健康度（数据驱动，不依赖 LLM）"""
    health = {}
    score_parts = []

    # --- 维护频率 ---
    commit_freq = extra_data.get('commitFrequency', {})
    if commit_freq:
        weekly_raw = commit_freq.get('weeklyCommits', 0)
        # weeklyCommits 可能是最近 4 周的数组，取平均值
        if isinstance(weekly_raw, list):
            weekly = sum(weekly_raw) / len(weekly_raw) if weekly_raw else 0
        else:
            weekly = weekly_raw or 0
        last_commit = commit_freq.get('lastCommitDate', '')
        if weekly >= 10:
            health['maintenanceFrequency'] = f'非常活跃（周均 {weekly} 次提交）'
            score_parts.append(9)
        elif weekly >= 3:
            health['maintenanceFrequency'] = f'活跃（周均 {weekly} 次提交）'
            score_parts.append(7)
        elif weekly >= 1:
            health['maintenanceFrequency'] = f'一般（周均 {weekly} 次提交）'
            score_parts.append(5)
        else:
            health['maintenanceFrequency'] = f'不活跃（周均 {weekly} 次提交）'
            score_parts.append(2)
        if last_commit:
            health['maintenanceFrequency'] += f'，最近提交: {last_commit}'

    # --- Issue 响应速度 ---
    issues = extra_data.get('issuesTopics', {})
    if issues and isinstance(issues, dict):
        open_count = issues.get('openCount', 0)
        closed_count = issues.get('closedCount', 0)
        total_issues = open_count + closed_count
        if total_issues > 0:
            close_ratio = closed_count / total_issues
            if close_ratio >= 0.8:
                health['issueResponseSpeed'] = f'优秀（关闭率 {close_ratio:.0%}，{closed_count}/{total_issues}）'
                score_parts.append(9)
            elif close_ratio >= 0.5:
                health['issueResponseSpeed'] = f'良好（关闭率 {close_ratio:.0%}，{closed_count}/{total_issues}）'
                score_parts.append(6)
            else:
                health['issueResponseSpeed'] = f'较慢（关闭率 {close_ratio:.0%}，{closed_count}/{total_issues}）'
                score_parts.append(3)
        else:
            health['issueResponseSpeed'] = '无 Issue 数据'

    # --- 社区规模 ---
    stars = raw_data.get('stars', 0) or (extra_data.get('repoInfo', {}) or {}).get('stargazersCount', 0)
    forks = raw_data.get('forks', 0) or (extra_data.get('repoInfo', {}) or {}).get('forksCount', 0)
    if stars or forks:
        if stars >= 10000:
            health['communitySize'] = f'大型社区（⭐ {stars:,}，🍴 {forks:,}）'
            score_parts.append(9)
        elif stars >= 1000:
            health['communitySize'] = f'中型社区（⭐ {stars:,}，🍴 {forks:,}）'
            score_parts.append(7)
        elif stars >= 100:
            health['communitySize'] = f'小型社区（⭐ {stars:,}，🍴 {forks:,}）'
            score_parts.append(5)
        else:
            health['communitySize'] = f'起步阶段（⭐ {stars:,}，🍴 {forks:,}）'
            score_parts.append(3)

    # --- 文档质量 ---
    repo_info = extra_data.get('repoInfo', {}) or {}
    readme = extra_data.get('readme', '')
    has_wiki = repo_info.get('hasWiki', False)
    has_pages = repo_info.get('hasPages', False)
    doc_score = 0
    doc_parts = []
    if readme:
        readme_len = len(readme)
        if readme_len >= 3000:
            doc_score += 4
            doc_parts.append(f'README 详尽（{readme_len} 字符）')
        elif readme_len >= 500:
            doc_score += 2
            doc_parts.append(f'README 基础（{readme_len} 字符）')
        else:
            doc_score += 1
            doc_parts.append(f'README 简短（{readme_len} 字符）')
    if has_wiki:
        doc_score += 2
        doc_parts.append('有 Wiki')
    if has_pages:
        doc_score += 2
        doc_parts.append('有 Pages 站点')
    if doc_parts:
        quality = '优秀' if doc_score >= 6 else '良好' if doc_score >= 3 else '基础'
        health['documentationQuality'] = f'{quality}（{", ".join(doc_parts)}）'
        score_parts.append(min(doc_score + 2, 10))

    # --- Release 频率 ---
    releases = extra_data.get('recentReleases', [])
    if releases:
        release_count = len(releases)
        prerelease_count = sum(1 for r in releases if r.get('prerelease'))
        health['releaseActivity'] = f'近期 {release_count} 个版本'
        if prerelease_count:
            health['releaseActivity'] += f'（含 {prerelease_count} 个预发布）'
        score_parts.append(min(release_count + 3, 9))

    # --- 综合评分 ---
    if score_parts:
        avg = sum(score_parts) / len(score_parts)
        health['overallScore'] = round(avg, 1)
        if avg >= 8:
            health['assessment'] = '社区非常健康，维护活跃，文档完善，适合生产使用'
        elif avg >= 6:
            health['assessment'] = '社区健康状况良好，有稳定的维护和社区支持'
        elif avg >= 4:
            health['assessment'] = '社区活跃度一般，建议关注维护状态后再决定是否采用'
        else:
            health['assessment'] = '社区活跃度较低，使用前需评估维护风险'
    else:
        health['assessment'] = '数据不足，无法评估社区健康度'

    return health


class EnrichService:
    """LLM 数据增强服务"""

    @staticmethod
    def _is_single_cancelled(result_id: str) -> bool:
        """检查单条增强是否被取消"""
        from app.extensions import redis_client
        return bool(redis_client.exists(f'crawler:enrich_single_cancel:{result_id}'))

    @staticmethod
    def enrich_single(result_id: str) -> EnrichedResult | dict:
        """对单条爬取结果进行 LLM 增强"""
        import time

        title_hint = result_id[:12]
        logger.info(f'[Enrich] ========== 开始增强 result_id={result_id} ==========')

        crawl_result = CrawlResult.find_by_id(result_id)
        if not crawl_result:
            logger.warning(f'[Enrich] 爬取结果不存在: {result_id}')
            return {'error': '爬取结果不存在'}

        title_hint = crawl_result.title or crawl_result.raw_data.get('fullName', result_id[:12]) if crawl_result.raw_data else result_id[:12]
        logger.info(f'[Enrich] 目标项目: {title_hint}')

        if not crawl_result.raw_data:
            logger.warning(f'[Enrich] {title_hint}: 没有原始数据，跳过')
            return {'error': '该结果没有原始数据，无法增强'}

        # 检查是否已增强
        existing = EnrichedResult.find_by_result_id(result_id)
        if existing and existing.status == 'success':
            logger.info(f'[Enrich] {title_hint}: 已有成功的增强结果，跳过')
            return {'error': '该结果已增强，如需重新增强请先删除'}

        # 标记运行中
        from app.extensions import redis_client
        running_key = f'crawler:enrich_single_running:{result_id}'
        cancel_key = f'crawler:enrich_single_cancel:{result_id}'
        redis_client.setex(running_key, 3600, '1')
        redis_client.delete(cancel_key)

        # 创建或复用记录
        enriched = existing or EnrichedResult(
            result_id=result_id,
            task_id=crawl_result.task_id,
            status='processing',
        )
        enriched.status = 'processing'
        enriched.error_msg = None
        enriched.save()
        logger.info(f'[Enrich] {title_hint}: 状态已更新为 processing')

        try:
            # ===== 步骤 1/5: 采集补充数据 =====
            step1_start = time.time()
            logger.info(f'[Enrich] {title_hint}: [步骤1/5] 开始采集补充数据...')

            has_token = bool(EnrichService._get_github_token(crawl_result.task_id))
            logger.info(f'[Enrich] {title_hint}: GitHub Token: {"已配置" if has_token else "未配置（可能触发 rate limit）"}')

            collector = DataCollector(
                token=EnrichService._get_github_token(crawl_result.task_id)
            )
            try:
                collected = collector.collect(crawl_result.raw_data)
            finally:
                collector.close()

            extra_data = collected.get('extra', {})
            data_sources = collected.get('sources', [])
            step1_elapsed = time.time() - step1_start

            project_type = extra_data.get('projectType', 'unknown')
            detected_lang = extra_data.get('detectedLanguage', 'unknown')
            logger.info(
                f'[Enrich] {title_hint}: [步骤1/5] 数据采集完成 '
                f'(耗时 {step1_elapsed:.1f}s, 来源: {data_sources}, '
                f'类型={project_type}, 语言={detected_lang})'
            )

            # 检查取消
            if EnrichService._is_single_cancelled(result_id):
                raise _EnrichCancelled()

            # ===== 步骤 2/5: 调用 LLM 结构化分析（不含文章） =====
            step2_start = time.time()
            logger.info(f'[Enrich] {title_hint}: [步骤2/5] 开始 LLM 结构化分析 (类型={project_type})...')

            llm_result = LLMService.enrich(crawl_result.raw_data, extra_data)
            parsed = llm_result['parsed']
            step2_elapsed = time.time() - step2_start
            total_tokens = llm_result['tokens_used']

            logger.info(
                f'[Enrich] {title_hint}: [步骤2/5] LLM 分析完成 '
                f'(耗时 {step2_elapsed:.1f}s, 模型={llm_result["model"]}, '
                f'tokens={llm_result["tokens_used"]}, '
                f'解析字段数={len(parsed)})'
            )

            # 检查取消
            if EnrichService._is_single_cancelled(result_id):
                raise _EnrichCancelled()

            # ===== 步骤 3/5: 调用 LLM 生成深度文章 =====
            step3_start = time.time()
            logger.info(f'[Enrich] {title_hint}: [步骤3/5] 开始 LLM 文章生成（第二轮调用）...')

            article_result = LLMService.generate_article(
                crawl_result.raw_data, extra_data, parsed
            )
            step3_elapsed = time.time() - step3_start
            total_tokens += article_result['tokens_used']

            logger.info(
                f'[Enrich] {title_hint}: [步骤3/5] 文章生成完成 '
                f'(耗时 {step3_elapsed:.1f}s, tokens={article_result["tokens_used"]}, '
                f'文章长度={len(article_result["article"])}字符)'
            )

            # 检查取消
            if EnrichService._is_single_cancelled(result_id):
                raise _EnrichCancelled()

            # ===== 步骤 4/5: 调用 LLM 生成实践部署教程 =====
            step4_start = time.time()
            logger.info(f'[Enrich] {title_hint}: [步骤4/5] 开始 LLM 教程生成（第三轮调用）...')

            tutorial_result = LLMService.generate_tutorial(
                crawl_result.raw_data, extra_data, parsed
            )
            step4_elapsed = time.time() - step4_start
            total_tokens += tutorial_result['tokens_used']

            logger.info(
                f'[Enrich] {title_hint}: [步骤4/5] 教程生成完成 '
                f'(耗时 {step4_elapsed:.1f}s, tokens={tutorial_result["tokens_used"]}, '
                f'教程长度={len(tutorial_result["article"])}字符)'
            )

            # 检查取消
            if EnrichService._is_single_cancelled(result_id):
                raise _EnrichCancelled()

            # ===== 步骤 5/5: 合并并保存结果 =====
            step5_start = time.time()
            logger.info(f'[Enrich] {title_hint}: [步骤5/5] 开始合并并保存结果...')

            # 通用字段
            enriched.title = parsed.get('title', crawl_result.title or '')
            enriched.summary = parsed.get('summary', '')
            enriched.category = parsed.get('category', '')
            enriched.tags = parsed.get('tags', [])
            enriched.highlights = parsed.get('highlights', [])
            enriched.use_cases = parsed.get('useCases', [])
            enriched.pros = parsed.get('pros', [])
            enriched.cons = parsed.get('cons', [])
            enriched.similar_projects = parsed.get('similarProjects', [])
            enriched.inspired_by = parsed.get('inspiredBy', [])
            enriched.difficulty_level = parsed.get('difficultyLevel', '')
            enriched.recommendation = parsed.get('recommendation', '')
            enriched.tech_stack = parsed.get('techStack', [])
            enriched.architecture = parsed.get('architecture', '')
            enriched.maturity_level = parsed.get('maturityLevel', '')
            enriched.quick_start_code = parsed.get('quickStartCode', '')
            enriched.best_practices = _safe_list(parsed.get('bestPractices'))
            enriched.one_liner_for_humans = parsed.get('oneLinerForHumans', '')
            enriched.beginner_guide = _safe_dict(parsed.get('beginnerGuide'))
            enriched.developer_guide = _safe_dict(parsed.get('developerGuide'))
            enriched.generated_article = article_result['article']
            enriched.generated_tutorial = tutorial_result['article']
            enriched.data_sources = data_sources

            # 项目类型元信息
            enriched.project_type = parsed.get('_projectType', extra_data.get('projectType', ''))
            enriched.detected_language = parsed.get('_detectedLanguage', extra_data.get('detectedLanguage', ''))

            # 通用可选字段（部分类型可能不返回）
            enriched.deploy_methods = parsed.get('deployMethods', [])
            enriched.deploy_steps = parsed.get('deploySteps', [])
            enriched.system_requirements = parsed.get('systemRequirements', '')
            # webArticleSummaries 复用 web_references 字段存储
            enriched.web_references = _safe_list(parsed.get('webArticleSummaries'))
            enriched.learning_resources = []  # 不再由 LLM 生成（URL 易编造）
            # 社区健康度：数据驱动计算，不依赖 LLM
            enriched.community_health = _compute_community_health(
                crawl_result.raw_data, extra_data
            )
            enriched.security_considerations = _safe_list(parsed.get('securityConsiderations'))
            enriched.migration_guide = _safe_dict(parsed.get('migrationGuide'))
            enriched.code_quality_score = _safe_dict(parsed.get('codeQualityScore'))

            # 深度思考（新结构：technicalAnalysis + marketPosition 替代 insights）
            deep = parsed.get('deepThinking', {})
            if isinstance(deep, dict):
                enriched.extension_ideas = deep.get('extensionIdeas', [])
                enriched.project_ideas = deep.get('projectIdeas', [])
                # 合并 technicalAnalysis 和 marketPosition 到 insights 字段
                parts = []
                if deep.get('technicalAnalysis'):
                    parts.append(deep['technicalAnalysis'])
                if deep.get('marketPosition'):
                    parts.append(deep['marketPosition'])
                enriched.insights = '\n\n'.join(parts) if parts else deep.get('insights', '')

            # 类型专属字段（存入 type_specific）
            type_specific = {}
            project_type = enriched.project_type

            if project_type == 'library':
                for key in ('apiDesign', 'compatibility', 'installMethods', 'performanceBenchmark'):
                    if key in parsed:
                        type_specific[key] = parsed[key]
            elif project_type == 'application':
                for key in ('configGuide', 'scalability'):
                    if key in parsed:
                        type_specific[key] = parsed[key]
            elif project_type == 'cli':
                for key in ('cliUsage', 'platformSupport', 'installMethods'):
                    if key in parsed:
                        type_specific[key] = parsed[key]
            elif project_type == 'docs':
                for key in ('contentAnalysis', 'learningPath', 'uniqueValue'):
                    if key in parsed:
                        type_specific[key] = parsed[key]
            elif project_type == 'data':
                for key in ('dataAnalysis', 'applicableScenarios', 'benchmarkResults'):
                    if key in parsed:
                        type_specific[key] = parsed[key]

            enriched.type_specific = type_specific
            enriched.project_structure_analysis = _safe_dict(parsed.get('projectStructureAnalysis'))
            enriched.raw_llm_response = llm_result['raw_response']
            enriched.model = llm_result['model']
            enriched.tokens_used = total_tokens
            enriched.status = 'success'
            enriched.save()

            # 保存文章到独立表（深度解析）
            article_content = article_result['article']
            if article_content:
                raw = crawl_result.raw_data or {}
                existing_article = GeneratedArticle.find_by_result_id(result_id, 'analysis')
                article_doc = existing_article or GeneratedArticle(
                    result_id=result_id,
                    task_id=crawl_result.task_id,
                )
                article_doc.enriched_id = enriched.id
                article_doc.title = parsed.get('title', crawl_result.title or '')
                article_doc.project_name = raw.get('fullName', '') or raw.get('name', '')
                article_doc.project_url = raw.get('url', '') or raw.get('htmlUrl', '')
                article_doc.category = parsed.get('category', '')
                article_doc.tags = parsed.get('tags', [])
                article_doc.article_type = 'analysis'
                article_doc.content = article_content
                article_doc.word_count = len(article_content)
                article_doc.model = article_result['model']
                article_doc.tokens_used = article_result['tokens_used']
                article_doc.status = 'success'
                article_doc.error_msg = None
                article_doc.save()
                logger.info(f'[Enrich] {title_hint}: 深度解析文章已保存 (article_id={article_doc.id}, {article_doc.word_count}字符)')

            # 保存文章到独立表（实践教程）
            tutorial_content = tutorial_result['article']
            if tutorial_content:
                raw = crawl_result.raw_data or {}
                existing_tutorial = GeneratedArticle.find_by_result_id(result_id, 'tutorial')
                tutorial_doc = existing_tutorial or GeneratedArticle(
                    result_id=result_id,
                    task_id=crawl_result.task_id,
                )
                tutorial_doc.enriched_id = enriched.id
                tutorial_doc.title = f'{parsed.get("title", crawl_result.title or "")} — 实践部署教程'
                tutorial_doc.project_name = raw.get('fullName', '') or raw.get('name', '')
                tutorial_doc.project_url = raw.get('url', '') or raw.get('htmlUrl', '')
                tutorial_doc.category = parsed.get('category', '')
                tutorial_doc.tags = parsed.get('tags', [])
                tutorial_doc.article_type = 'tutorial'
                tutorial_doc.content = tutorial_content
                tutorial_doc.word_count = len(tutorial_content)
                tutorial_doc.model = tutorial_result['model']
                tutorial_doc.tokens_used = tutorial_result['tokens_used']
                tutorial_doc.status = 'success'
                tutorial_doc.error_msg = None
                tutorial_doc.save()
                logger.info(f'[Enrich] {title_hint}: 实践教程已保存 (article_id={tutorial_doc.id}, {tutorial_doc.word_count}字符)')

            step5_elapsed = time.time() - step5_start
            total_elapsed = time.time() - step1_start
            type_keys = list(type_specific.keys()) if type_specific else []
            logger.info(
                f'[Enrich] {title_hint}: [步骤5/5] 结果保存完成 '
                f'(耗时 {step5_elapsed:.1f}s, 类型专属字段: {type_keys})'
            )
            logger.info(
                f'[Enrich] ========== {title_hint} 增强完成 '
                f'(总耗时 {total_elapsed:.1f}s, 模型={llm_result["model"]}, '
                f'总tokens={total_tokens}, '
                f'分析tokens={llm_result["tokens_used"]}, '
                f'文章tokens={article_result["tokens_used"]}, '
                f'教程tokens={tutorial_result["tokens_used"]}) =========='
            )
            return enriched

        except _EnrichCancelled:
            enriched.status = 'failed'
            enriched.error_msg = '用户取消'
            enriched.save()
            logger.info(f'[Enrich] {title_hint}: 用户取消增强')
            return {'error': '增强已取消', 'cancelled': True}

        except Exception as e:
            enriched.status = 'failed'
            enriched.error_msg = str(e)[:500]
            enriched.save()
            logger.error(
                f'[Enrich] ========== {title_hint} 增强失败 ==========\n'
                f'  错误类型: {type(e).__name__}\n'
                f'  错误信息: {str(e)[:300]}\n'
                f'  result_id: {result_id}',
                exc_info=True,
            )
            return {'error': f'LLM 增强失败: {str(e)[:200]}'}

        finally:
            redis_client.delete(running_key)
            redis_client.delete(cancel_key)

    @staticmethod
    def enrich_single_async(result_id: str, app) -> dict:
        """异步执行单条增强（在后台线程中运行）"""
        from app.extensions import redis_client
        import threading

        running_key = f'crawler:enrich_single_running:{result_id}'

        # 检查是否已在运行
        if redis_client.exists(running_key):
            return {'error': '该结果正在增强中'}

        # 预检查
        crawl_result = CrawlResult.find_by_id(result_id)
        if not crawl_result:
            return {'error': '爬取结果不存在'}
        if not crawl_result.raw_data:
            return {'error': '该结果没有原始数据，无法增强'}
        existing = EnrichedResult.find_by_result_id(result_id)
        if existing and existing.status == 'success':
            return {'error': '该结果已增强，如需重新增强请先删除'}

        def _run():
            with app.app_context():
                EnrichService.enrich_single(result_id)

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()
        return {'message': '增强已开始', 'resultId': result_id}

    @staticmethod
    def stop_enrich_single(result_id: str) -> dict:
        """停止单条增强"""
        from app.extensions import redis_client

        running_key = f'crawler:enrich_single_running:{result_id}'
        cancel_key = f'crawler:enrich_single_cancel:{result_id}'

        if redis_client.exists(running_key):
            # 正在异步增强中，发送取消信号
            redis_client.setex(cancel_key, 3600, '1')
            logger.info(f'[Enrich] 单条停止信号已发送: result_id={result_id}')
            return {'message': '停止信号已发送', 'resultId': result_id}

        # 可能是批量增强中的一条，或者状态残留
        # 尝试直接将 processing 状态改为 failed
        enriched = EnrichedResult.find_by_result_id(result_id)
        if enriched and enriched.status == 'processing':
            enriched.status = 'failed'
            enriched.error_msg = '用户取消'
            enriched.save()
            logger.info(f'[Enrich] 单条增强已标记取消（非异步模式）: result_id={result_id}')
            return {'message': '已取消', 'resultId': result_id}

        return {'error': '该结果未在增强中'}

    @staticmethod
    def is_single_enriching(result_id: str) -> bool:
        """检查单条结果是否正在增强中"""
        from app.extensions import redis_client
        if redis_client.exists(f'crawler:enrich_single_running:{result_id}'):
            return True
        # 也检查 MongoDB 状态（可能是批量增强中的一条）
        enriched = EnrichedResult.find_by_result_id(result_id)
        return bool(enriched and enriched.status == 'processing')

    @staticmethod
    def _get_github_token(task_id: str) -> str | None:
        """从任务配置或全局配置中获取 GitHub token"""
        from app.models.task import CrawlTask
        task = CrawlTask.find_by_id(task_id)
        if task and task.config:
            token = task.config.get('githubToken')
            if token:
                return token
        # 回退到全局配置
        from flask import current_app
        return current_app.config.get('GITHUB_TOKEN') or None

    @staticmethod
    def enrich_task(task_id: str, app) -> dict:
        """对任务的所有成功结果进行批量 LLM 增强（同步执行）"""
        from app.extensions import redis_client

        cancel_key = f'crawler:enrich_cancel:{task_id}'
        running_key = f'crawler:enrich_running:{task_id}'

        # 检查是否已在运行
        if redis_client.exists(running_key):
            return {'error': '该任务正在增强中，请勿重复提交'}

        results = CrawlResult._col().find(
            {'task_id': task_id, 'status': 'success'},
            {'_id': 1},
        )
        result_ids = [str(doc['_id']) for doc in results]

        if not result_ids:
            logger.info(f'[Enrich] 批量增强: 任务 {task_id} 没有可增强的成功结果')
            return {'error': '没有可增强的成功结果'}

        # 标记运行中，清除旧的取消标志
        redis_client.setex(running_key, 7200, '1')
        redis_client.delete(cancel_key)

        logger.info(f'[Enrich] >>>>>>>>>> 批量增强开始: 任务 {task_id}, 共 {len(result_ids)} 条结果 >>>>>>>>>>')

        success_count = 0
        fail_count = 0
        skip_count = 0
        cancelled = False

        try:
            for idx, rid in enumerate(result_ids, 1):
                # 检查取消标志
                if redis_client.exists(cancel_key):
                    cancelled = True
                    logger.info(f'[Enrich] 批量 [{idx}/{len(result_ids)}] 检测到取消标志，停止增强')
                    break

                existing = EnrichedResult.find_by_result_id(rid)
                if existing and existing.status == 'success':
                    skip_count += 1
                    logger.info(f'[Enrich] 批量 [{idx}/{len(result_ids)}] result_id={rid[:12]}... 已增强，跳过')
                    continue

                logger.info(f'[Enrich] 批量 [{idx}/{len(result_ids)}] 开始增强 result_id={rid[:12]}...')

                with app.app_context():
                    result = EnrichService.enrich_single(rid)

                if isinstance(result, EnrichedResult):
                    success_count += 1
                else:
                    fail_count += 1
                    error_msg = result.get('error', '未知错误') if isinstance(result, dict) else '未知错误'
                    logger.warning(f'[Enrich] 批量 [{idx}/{len(result_ids)}] result_id={rid[:12]}... 失败: {error_msg}')
        finally:
            redis_client.delete(running_key)
            redis_client.delete(cancel_key)

        status_msg = '已取消' if cancelled else '完成'
        logger.info(
            f'[Enrich] <<<<<<<<<< 批量增强{status_msg}: 任务 {task_id} '
            f'(总计={len(result_ids)}, 成功={success_count}, 失败={fail_count}, 跳过={skip_count}) <<<<<<<<<<'
        )

        return {
            'total': len(result_ids),
            'success': success_count,
            'failed': fail_count,
            'skipped': skip_count,
            'cancelled': cancelled,
        }

    @staticmethod
    def stop_enrich(task_id: str) -> dict:
        """停止批量增强"""
        from app.extensions import redis_client

        running_key = f'crawler:enrich_running:{task_id}'
        cancel_key = f'crawler:enrich_cancel:{task_id}'

        if not redis_client.exists(running_key):
            return {'error': '该任务未在增强中'}

        redis_client.setex(cancel_key, 3600, '1')
        logger.info(f'[Enrich] 停止信号已发送: task_id={task_id}')
        return {'message': '停止信号已发送', 'taskId': task_id}

    @staticmethod
    def is_enriching(task_id: str) -> bool:
        """检查任务是否正在增强中"""
        from app.extensions import redis_client
        return bool(redis_client.exists(f'crawler:enrich_running:{task_id}'))

    @staticmethod
    def get_enriched(result_id: str) -> EnrichedResult | None:
        return EnrichedResult.find_by_result_id(result_id)

    @staticmethod
    def list_by_task(task_id: str, page: int = 1, page_size: int = 20):
        items, total = EnrichedResult.find_by_task(task_id, page, page_size)
        return {
            'pageData': [item.to_dict() for item in items],
            'total': total,
        }

    @staticmethod
    def delete_enriched(enriched_id: str) -> bool:
        enriched = EnrichedResult.find_by_id(enriched_id)
        if not enriched:
            return False
        enriched.delete()
        return True

    @staticmethod
    def get_status_map(task_id: str) -> dict[str, str]:
        """获取任务下所有结果的增强状态映射"""
        return EnrichedResult.get_status_map(task_id)

    @staticmethod
    def delete_by_task(task_id: str) -> int:
        count = EnrichedResult._col().count_documents({'task_id': task_id})
        EnrichedResult.delete_by_task(task_id)
        return count
