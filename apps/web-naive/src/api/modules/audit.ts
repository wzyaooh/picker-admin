import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================
export namespace AuditApi {
  /** 审计日志 */
  export interface AuditLog {
    id: number;
    requestId: string;
    time: string;
    durationMs: number;
    method: string;
    path: string;
    controller?: string;
    handler?: string;
    ip?: string;
    userAgent?: string;
    userId?: number;
    username?: string;
    currentRoleCode?: string;
    action?: string;
    description?: string;
    success: number;
    statusCode?: number;
    errorCode?: number;
    errorMessage?: string;
    reqQuery?: string;
    reqParams?: string;
    reqBody?: string;
    resBody?: string;
  }

  /** 查询审计日志参数 */
  export interface QueryAuditParams {
    page?: number;
    pageSize?: number;
    userId?: number;
    username?: string;
    action?: string;
    method?: string;
    path?: string;
    startDate?: string;
    endDate?: string;
    success?: number;
  }

  /** 分页结果 */
  export interface PageResult {
    items: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
  }
}

// ==================== API 函数 ====================

/**
 * 查询审计日志列表
 *
 * 分页查询审计日志列表，支持多种筛选条件。
 * 可以按用户、操作、方法、路径、时间范围等条件筛选。
 * 审计日志记录了系统中所有重要操作的详细信息，用于安全审计和问题追踪。
 *
 * @param params 查询参数
 * @param params.page 页码（可选，从1开始，默认1）
 * @param params.pageSize 每页数量（可选，默认10）
 * @param params.userId 用户ID（可选，精确匹配）
 * @param params.username 用户名（可选，模糊查询）
 * @param params.action 操作类型（可选，如：创建用户、删除角色）
 * @param params.method HTTP方法（可选，如：GET、POST、DELETE）
 * @param params.path 请求路径（可选，模糊查询）
 * @param params.startDate 开始日期（可选，格式：YYYY-MM-DD）
 * @param params.endDate 结束日期（可选，格式：YYYY-MM-DD）
 * @returns 分页查询结果，包含日志列表和总数
 * @throws {Error} 当查询参数不合法时抛出错误
 *
 * @example
 * ```typescript
 * // 基本分页查询
 * const result = await getAuditLogsApi({
 *   page: 1,
 *   pageSize: 20
 * });
 * console.log(result.items); // 日志列表
 * console.log(result.total); // 总记录数
 * ```
 *
 * @example
 * ```typescript
 * // 查询指定用户的操作日志
 * const result = await getAuditLogsApi({
 *   page: 1,
 *   pageSize: 20,
 *   username: 'admin'
 * });
 * ```
 *
 * @example
 * ```typescript
 * // 查询指定时间范围的日志
 * const result = await getAuditLogsApi({
 *   page: 1,
 *   pageSize: 20,
 *   startDate: '2026-01-01',
 *   endDate: '2026-01-31'
 * });
 * ```
 */
export async function getAuditLogsApi(params: AuditApi.QueryAuditParams): Promise<AuditApi.PageResult> {
  return requestClient.get<AuditApi.PageResult>('/audit', { params });
}

/**
 * 查询审计日志详情
 *
 * 根据日志ID查询审计日志的详细信息。
 * 返回的日志信息包含完整的请求和响应数据，用于详细分析操作过程。
 * 此接口通常用于审计日志详情页面或问题排查。
 *
 * @param id 日志ID
 * @returns 审计日志详细信息
 * @throws {Error} 当日志不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 查询日志详情
 * const log = await getAuditLogApi(1);
 * console.log(log.action); // 操作类型
 * console.log(log.requestBody); // 请求数据
 * console.log(log.responseBody); // 响应数据
 * console.log(log.duration); // 执行时长（毫秒）
 * ```
 *
 * @example
 * ```typescript
 * // 在详情页面使用
 * const log = await getAuditLogApi(logId);
 * // 展示完整的操作信息
 * ```
 */
export async function getAuditLogApi(id: number): Promise<AuditApi.AuditLog> {
  return requestClient.get<AuditApi.AuditLog>(`/audit/${id}`);
}

/**
 * 查询最近审计日志
 *
 * 查询最近的审计日志记录，按时间倒序排列。
 * 此接口不分页，直接返回指定数量的最新日志。
 * 通常用于仪表板、实时监控等场景，快速查看最近的系统操作。
 *
 * @param take 获取数量（可选，默认20条，最大100条）
 * @returns 最近的审计日志列表
 * @throws {Error} 当参数不合法时抛出错误
 *
 * @example
 * ```typescript
 * // 查询最近20条日志
 * const logs = await getRecentAuditLogsApi();
 * console.log(logs); // 最新的20条日志
 * ```
 *
 * @example
 * ```typescript
 * // 查询最近50条日志
 * const logs = await getRecentAuditLogsApi(50);
 * ```
 *
 * @example
 * ```typescript
 * // 在仪表板显示最近操作
 * const recentLogs = await getRecentAuditLogsApi(10);
 * // 展示在"最近操作"面板中
 * ```
 */
export async function getRecentAuditLogsApi(take: number = 20): Promise<AuditApi.AuditLog[]> {
  return requestClient.get<AuditApi.AuditLog[]>('/audit/recent', {
    params: { take },
  });
}
