import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================
export namespace ApiKeyApi {
  /** API Key 信息 */
  export interface ApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    description?: string;
    permissions: string[];
    rateLimit: number;
    enabled: boolean;
    expiresAt?: string;
    lastUsedAt?: string;
    createdAt: string;
    updatedAt: string;
  }

  /** 创建 API Key 参数 */
  export interface CreateParams {
    name: string;
    description?: string;
    permissions: string[];
    rateLimit?: number;
    expiresAt?: string;
  }

  /** 更新 API Key 参数 */
  export interface UpdateParams {
    name?: string;
    description?: string;
    permissions?: string[];
    rateLimit?: number;
    enabled?: boolean;
    expiresAt?: string;
  }

  /** 查询参数 */
  export interface QueryParams {
    pageNo?: number;
    pageSize?: number;
    keyword?: string;
    enabled?: boolean;
  }

  /** 分页响应 */
  export interface PageResult {
    pageData: ApiKey[];
    total: number;
  }

  /** 创建响应（包含完整密钥） */
  export interface CreateResult {
    apiKey: ApiKey;
    fullKey: string;
  }

  /** 使用统计 */
  export interface UsageStats {
    totalRequests: number;
    todayRequests: number;
    lastHourRequests: number;
    avgResponseTime: number;
  }

  /** 访问日志 */
  export interface AccessLog {
    id: number;
    apiKeyId: string;
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    ipAddress: string;
    userAgent: string;
    createdAt: string;
  }

  /** 访问日志查询参数 */
  export interface LogQueryParams {
    pageNo?: number;
    pageSize?: number;
    apiKeyId?: string;
    method?: string;
    statusCode?: number;
    startDate?: string;
    endDate?: string;
  }

  /** 访问日志分页响应 */
  export interface LogPageResult {
    pageData: AccessLog[];
    total: number;
  }
}

// ==================== API 函数 ====================

/**
 * 获取 API Key 列表
 * @param params 查询参数
 */
export async function getApiKeyListApi(params: ApiKeyApi.QueryParams = {}) {
  return requestClient.get<ApiKeyApi.PageResult>('/api-keys', { params });
}

/**
 * 获取 API Key 详情
 * @param id API Key ID
 */
export async function getApiKeyApi(id: string) {
  return requestClient.get<ApiKeyApi.ApiKey>(`/api-keys/${id}`);
}

/**
 * 创建 API Key
 * @param data 创建数据
 */
export async function createApiKeyApi(data: ApiKeyApi.CreateParams) {
  return requestClient.post<ApiKeyApi.CreateResult>('/api-keys', data);
}

/**
 * 更新 API Key
 * @param id API Key ID
 * @param data 更新数据
 */
export async function updateApiKeyApi(id: string, data: ApiKeyApi.UpdateParams) {
  return requestClient.patch<ApiKeyApi.ApiKey>(`/api-keys/${id}`, data);
}

/**
 * 删除 API Key
 * @param id API Key ID
 */
export async function deleteApiKeyApi(id: string) {
  return requestClient.delete<boolean>(`/api-keys/${id}`);
}

/**
 * 启用/禁用 API Key
 * @param id API Key ID
 * @param enabled 是否启用
 */
export async function toggleApiKeyApi(id: string, enabled: boolean) {
  return requestClient.patch<ApiKeyApi.ApiKey>(`/api-keys/${id}/toggle`, { enabled });
}

/**
 * 重新生成 API Key
 * @param id API Key ID
 */
export async function regenerateApiKeyApi(id: string) {
  return requestClient.post<ApiKeyApi.CreateResult>(`/api-keys/${id}/regenerate`);
}

/**
 * 获取 API Key 使用统计
 * @param id API Key ID
 */
export async function getApiKeyStatsApi(id: string) {
  return requestClient.get<ApiKeyApi.UsageStats>(`/api-keys/${id}/stats`);
}

/**
 * 获取访问日志
 * @param params 查询参数
 */
export async function getAccessLogsApi(params: ApiKeyApi.LogQueryParams = {}) {
  return requestClient.get<ApiKeyApi.LogPageResult>('/api-keys/logs', { params });
}

/**
 * 获取可用权限列表
 */
export async function getAvailablePermissionsApi() {
  return requestClient.get<Array<{
    code: string;
    name: string;
    description: string;
    category: string;
    children?: Array<{
      code: string;
      name: string;
      description: string;
      method: string;
      path: string;
    }>;
  }>>('/api-keys/permissions');
}
