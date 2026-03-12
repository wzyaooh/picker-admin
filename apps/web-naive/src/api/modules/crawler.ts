import { crawlerRequest } from '#/utils/crawler-request';

// ==================== 类型定义 ====================
export namespace CrawlerApi {
  export interface CrawlTask {
    id: string;
    name: string;
    spiderName: string;
    targetUrl: string;
    cronExpr: null | string;
    config: null | Record<string, any>;
    status: 'cancelled' | 'error' | 'idle' | 'running';
    lastRunAt: null | string;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface CrawlResult {
    id: string;
    taskId: string;
    url: string;
    title: null | string;
    content: null | string;
    rawData: null | Record<string, any>;
    status: 'failed' | 'success';
    errorMsg: null | string;
    elapsedMs: null | number;
    createdAt: string;
  }

  export interface TaskStats {
    totalRuns: number;
    successCount: number;
    failCount: number;
    totalItems: number;
    lastElapsedMs: number;
  }

  export interface GlobalStats {
    totalTasks: number;
    runningTasks: number;
    totalRuns: number;
    totalSuccess: number;
    totalFails: number;
  }

  export interface Spider {
    name: string;
    class: string;
    doc: string;
  }

  export interface PageResult<T> {
    pageData: T[];
    total: number;
  }

  export interface CreateTaskParams {
    name: string;
    spiderName: string;
    targetUrl: string;
    cronExpr?: string;
    config?: Record<string, any>;
    enabled?: boolean;
  }

  export interface UpdateTaskParams {
    name?: string;
    targetUrl?: string;
    cronExpr?: string;
    config?: Record<string, any>;
    enabled?: boolean;
  }

  export interface EnrichedResult {
    id: string;
    resultId: string;
    taskId: string;
    title: string;
    summary: string;
    category: string;
    tags: string[];
    highlights: string[];
    useCases: string[];
    pros: string[];
    cons: string[];
    similarProjects: string[];
    inspiredBy: string[];
    difficultyLevel: string;
    recommendation: string;
    deployMethods: string[];
    deploySteps: string[];
    systemRequirements: string;
    techStack: string[];
    architecture: string;
    dataSources: string[];
    webReferences: Array<{
      title: string;
      url?: string;
      summary?: string;
      keyInsights?: string;
      relevance?: string;
    }>;
    extensionIdeas: string[];
    projectIdeas: string[];
    insights: string;
    learningResources: Array<{
      type: string;
      title: string;
      url: string;
      description: string;
    }>;
    communityHealth: {
      maintenanceFrequency?: string;
      issueResponseSpeed?: string;
      communitySize?: string;
      documentationQuality?: string;
      releaseActivity?: string;
      overallScore?: number | string;
      assessment?: string;
    };
    securityConsiderations: string[];
    migrationGuide: {
      fromProjects?: Array<{
        name: string;
        steps: string[];
        difficulty: string;
        notes: string;
      }>;
    };
    codeQualityScore: {
      overall?: number;
      dimensions?: {
        readability?: number;
        testCoverage?: number;
        documentation?: number;
        architecture?: number;
        errorHandling?: number;
      };
      assessment?: string;
    };
    bestPractices: string[];
    oneLinerForHumans: string;
    beginnerGuide: {
      whatItDoes?: string;
      whoShouldUse?: string;
      howToStart?: string;
      realWorldAnalogy?: string;
    };
    developerGuide: {
      whyChooseThis?: string;
      architectureInsight?: string;
      integrationTips?: string;
      codeWorthReading?: string;
    };
    quickStartCode: string;
    generatedArticle: string;
    generatedTutorial: string;
    maturityLevel: string;
    projectType: string;
    detectedLanguage: string;
    projectStructureAnalysis: {
      overview?: string;
      coreModules?: Array<{
        name: string;
        path: string;
        purpose: string;
        keyFiles: string[];
      }>;
      entryPoints?: string[];
      configFiles?: string[];
      architectureDiagram?: string;
      workflowDescription?: string;
      designPatterns?: string[];
      layerStructure?: string;
    };
    typeSpecific: Record<string, any>;
    model: string;
    tokensUsed: number;
    status: 'failed' | 'pending' | 'processing' | 'success';
    errorMsg: null | string;
    createdAt: string;
    updatedAt: string;
  }

  export interface EnrichTaskResult {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    cancelled?: boolean;
  }

  export interface GeneratedArticle {
    id: string;
    resultId: string;
    taskId: string;
    enrichedId: string;
    title: string;
    projectName: string;
    projectUrl: string;
    category: string;
    tags: string[];
    articleType: 'analysis' | 'tutorial';
    content: string;
    wordCount: number;
    model: string;
    tokensUsed: number;
    version: number;
    parentId: string;
    groupId: string;
    isLatest: boolean;
    polishSummary: string;
    dataDiff: Record<string, any>;
    status: 'failed' | 'pending' | 'processing' | 'success';
    errorMsg: null | string;
    createdAt: string;
    updatedAt: string;
  }

  /** 文章列表项（不含 content） */
  export interface GeneratedArticleListItem {
    id: string;
    resultId: string;
    taskId: string;
    enrichedId: string;
    title: string;
    projectName: string;
    projectUrl: string;
    category: string;
    tags: string[];
    articleType: 'analysis' | 'tutorial';
    wordCount: number;
    model: string;
    tokensUsed: number;
    version: number;
    parentId: string;
    groupId: string;
    isLatest: boolean;
    polishSummary: string;
    status: 'failed' | 'pending' | 'processing' | 'success';
    errorMsg: null | string;
    createdAt: string;
    updatedAt: string;
  }

  /** 版本列表项 */
  export interface ArticleVersionItem {
    id: string;
    version: number;
    isLatest: boolean;
    polishSummary: string;
    wordCount: number;
    model: string;
    tokensUsed: number;
    status: string;
    createdAt: string;
  }

  /** 润色状态 */
  export interface PolishStatus {
    polishing: boolean;
    articleId?: string;
  }
}

// ==================== API 函数 ====================

export async function getTaskListApi(params?: {
  keyword?: string;
  pageNo?: number;
  pageSize?: number;
}) {
  return crawlerRequest.get<CrawlerApi.PageResult<CrawlerApi.CrawlTask>>(
    '/tasks',
    { params },
  );
}

export async function createTaskApi(data: CrawlerApi.CreateTaskParams) {
  return crawlerRequest.post<CrawlerApi.CrawlTask>(
    '/tasks',
    data,
  );
}

export async function updateTaskApi(
  id: string,
  data: CrawlerApi.UpdateTaskParams,
) {
  return crawlerRequest.patch<CrawlerApi.CrawlTask>(
    `/tasks/${id}`,
    data,
  );
}

export async function deleteTaskApi(id: string) {
  return crawlerRequest.delete(`/tasks/${id}`);
}

export async function runTaskApi(id: string) {
  return crawlerRequest.post(`/tasks/${id}/run`);
}

export async function stopTaskApi(id: string, force = false) {
  return crawlerRequest.post(`/tasks/${id}/stop`, { force });
}

export async function clearDedupApi(id: string) {
  return crawlerRequest.delete(`/tasks/${id}/dedup`);
}

export async function clearResultsApi(id: string) {
  return crawlerRequest.delete<{ deleted: number }>(
    `/tasks/${id}/results`,
  );
}

export async function getTaskResultsApi(
  taskId: string,
  params?: { pageNo?: number; pageSize?: number },
) {
  return crawlerRequest.get<
    CrawlerApi.PageResult<CrawlerApi.CrawlResult>
  >(`/tasks/${taskId}/results`, { params });
}

export async function getSpidersApi() {
  return crawlerRequest.get<CrawlerApi.Spider[]>('/spiders');
}

export async function getGlobalStatsApi(params?: {
  exclude?: string;
  include?: string;
}) {
  return crawlerRequest.get<CrawlerApi.GlobalStats>(
    '/stats',
    { params },
  );
}

export async function getTaskStatsApi(taskId: string) {
  return crawlerRequest.get<CrawlerApi.TaskStats>(
    `/tasks/${taskId}/stats`,
  );
}

// ==================== LLM 增强 API ====================

export async function enrichSingleApi(resultId: string) {
  return crawlerRequest.post<{ message: string; resultId: string }>(
    `/enrich/${resultId}`,
  );
}

export async function stopEnrichSingleApi(resultId: string) {
  return crawlerRequest.post(`/enrich/${resultId}/stop`);
}

export async function clearEnrichStatusApi(resultId: string) {
  return crawlerRequest.post<{
    message: string;
    redisKeysDeleted: number;
    mongoUpdated: boolean;
  }>(`/enrich/${resultId}/clear`);
}

export async function isSingleEnrichingApi(resultId: string) {
  return crawlerRequest.get<{ enriching: boolean }>(
    `/enrich/${resultId}/enriching`,
  );
}

export async function enrichTaskApi(taskId: string) {
  return crawlerRequest.post<CrawlerApi.EnrichTaskResult>(
    `/enrich/task/${taskId}`,
  );
}

export async function getEnrichedResultApi(resultId: string) {
  return crawlerRequest.get<CrawlerApi.EnrichedResult>(
    `/enrich/result/${resultId}`,
  );
}

export async function listEnrichedByTaskApi(
  taskId: string,
  params?: { pageNo?: number; pageSize?: number },
) {
  return crawlerRequest.get<
    CrawlerApi.PageResult<CrawlerApi.EnrichedResult>
  >(`/enrich/task/${taskId}/list`, { params });
}

export async function getEnrichStatusMapApi(taskId: string) {
  return crawlerRequest.get<Record<string, string>>(
    `/enrich/task/${taskId}/status`,
  );
}

export async function deleteEnrichedApi(enrichedId: string) {
  return crawlerRequest.delete(`/enrich/${enrichedId}`);
}

export async function deleteEnrichedByTaskApi(taskId: string) {
  return crawlerRequest.delete<{ deleted: number }>(
    `/enrich/task/${taskId}`,
  );
}

export async function stopEnrichTaskApi(taskId: string) {
  return crawlerRequest.post(`/enrich/task/${taskId}/stop`);
}

export async function isEnrichingApi(taskId: string) {
  return crawlerRequest.get<{ enriching: boolean }>(
    `/enrich/task/${taskId}/enriching`,
  );
}

export async function deleteSingleResultApi(resultId: string) {
  return crawlerRequest.delete(`/results/${resultId}`);
}

export async function getAllResultsApi(params?: {
  keyword?: string;
  pageNo?: number;
  pageSize?: number;
  taskId?: string;
  taskName?: string;
}) {
  return crawlerRequest.get<
    CrawlerApi.PageResult<CrawlerApi.CrawlResult & { taskName?: string }>
  >('/results', { params });
}


// ==================== 文章 API ====================

export async function listArticlesApi(params?: {
  keyword?: string;
  pageNo?: number;
  pageSize?: number;
}) {
  return crawlerRequest.get<
    CrawlerApi.PageResult<CrawlerApi.GeneratedArticleListItem>
  >('/articles', { params });
}

export async function getArticleApi(articleId: string) {
  return crawlerRequest.get<CrawlerApi.GeneratedArticle>(
    `/articles/${articleId}`,
  );
}

export async function getArticleByResultApi(resultId: string) {
  return crawlerRequest.get<CrawlerApi.GeneratedArticle>(
    `/articles/result/${resultId}`,
  );
}

export async function listArticlesByTaskApi(
  taskId: string,
  params?: { pageNo?: number; pageSize?: number },
) {
  return crawlerRequest.get<
    CrawlerApi.PageResult<CrawlerApi.GeneratedArticleListItem>
  >(`/articles/task/${taskId}`, { params });
}

export async function deleteArticleApi(articleId: string) {
  return crawlerRequest.delete(`/articles/${articleId}`);
}

export async function deleteArticlesByTaskApi(taskId: string) {
  return crawlerRequest.delete<{ deleted: number }>(
    `/articles/task/${taskId}`,
  );
}


// ==================== 文章润色 + 版本管理 API ====================

export async function polishArticleApi(articleId: string, customInstructions?: string) {
  return crawlerRequest.post<{ articleId: string; message: string }>(
    `/articles/${articleId}/polish`,
    customInstructions ? { customInstructions } : {},
  );
}

export async function getPolishStatusApi(articleId: string) {
  return crawlerRequest.get<CrawlerApi.PolishStatus>(
    `/articles/${articleId}/polish/status`,
  );
}

export async function getArticleVersionsApi(articleId: string) {
  return crawlerRequest.get<CrawlerApi.ArticleVersionItem[]>(
    `/articles/${articleId}/versions`,
  );
}

export async function setLatestVersionApi(articleId: string) {
  return crawlerRequest.patch<{ message: string }>(
    `/articles/${articleId}/set-latest`,
  );
}

export async function deleteArticleVersionApi(articleId: string) {
  return crawlerRequest.delete<{ message: string }>(
    `/articles/${articleId}/version`,
  );
}
