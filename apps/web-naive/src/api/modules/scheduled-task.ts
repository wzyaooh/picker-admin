import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/**
 * 定时任务相关 API 类型定义
 */
export namespace ScheduledTaskApi {
  /** 定时任务信息 */
  export interface ScheduledTask {
    id: number;
    /** 任务名称 */
    name: string;
    /** 任务组 */
    taskGroup: string;
    /** 描述 */
    description: null | string;
    /** 触发类型 */
    triggerType: 'CRON' | 'INTERVAL';
    /** Cron 表达式 */
    cronExpression: null | string;
    /** 间隔秒数 */
    intervalSeconds: null | number;
    /** 任务类型 */
    taskType: 'HTTP' | 'LOCAL';
    /** 执行器名称（LOCAL 时为 handler 名称，HTTP 时为 URL） */
    handlerName: string;
    /** 任务参数（JSON） */
    taskParams: null | string;
    /** HTTP 请求方法 */
    httpMethod: 'DELETE' | 'GET' | 'POST' | 'PUT' | null;
    /** HTTP 自定义请求头（JSON） */
    httpHeaders: null | string;
    /** HTTP 认证类型 */
    httpAuthType: 'API_KEY' | 'BASIC' | 'BEARER' | 'NONE' | null;
    /** HTTP 认证值 */
    httpAuthValue: null | string;
    /** 阻塞策略 */
    blockingStrategy: 'COVER' | 'DISCARD' | 'QUEUE';
    /** 超时时间（秒），0 表示不限制 */
    timeoutSeconds: number;
    /** 最大重试次数 */
    maxRetryCount: number;
    /** 重试间隔（秒） */
    retryInterval: number;
    /** 是否启用（0-停用 1-启用） */
    enabled: number;
    /** 上次执行时间 */
    lastExecuteTime: null | string;
    /** 创建时间 */
    createdAt: string;
    /** 更新时间 */
    updatedAt: string;
  }

  /** 任务执行日志 */
  export interface TaskLog {
    id: number;
    /** 任务ID */
    taskId: number;
    /** 任务名称 */
    taskName: string;
    /** 触发方式 */
    triggeredBy: 'MANUAL' | 'SCHEDULE';
    /** 开始时间 */
    startTime: string;
    /** 结束时间 */
    endTime: null | string;
    /** 耗时（毫秒） */
    durationMs: number;
    /** 执行状态 */
    status: 'FAIL' | 'SUCCESS' | 'TIMEOUT';
    /** 执行结果 */
    result: null | string;
    /** 错误信息 */
    errorMessage: null | string;
    /** 实际重试次数 */
    retryCount: number;
  }

  /** 创建任务参数 */
  export interface CreateParams {
    name: string;
    taskGroup: string;
    description?: string;
    triggerType: 'CRON' | 'INTERVAL';
    cronExpression?: string;
    intervalSeconds?: number;
    taskType: 'HTTP' | 'LOCAL';
    handlerName: string;
    taskParams?: string;
    httpMethod?: 'DELETE' | 'GET' | 'POST' | 'PUT';
    httpHeaders?: string;
    httpAuthType?: 'API_KEY' | 'BASIC' | 'BEARER' | 'NONE';
    httpAuthValue?: string;
    blockingStrategy?: 'COVER' | 'DISCARD' | 'QUEUE';
    timeoutSeconds?: number;
    maxRetryCount?: number;
    retryInterval?: number;
    enabled?: number;
  }

  /** 更新任务参数 */
  export interface UpdateParams {
    name?: string;
    taskGroup?: string;
    description?: string;
    triggerType?: 'CRON' | 'INTERVAL';
    cronExpression?: string;
    intervalSeconds?: number;
    taskType?: 'HTTP' | 'LOCAL';
    handlerName?: string;
    taskParams?: string;
    httpMethod?: 'DELETE' | 'GET' | 'POST' | 'PUT';
    httpHeaders?: string;
    httpAuthType?: 'API_KEY' | 'BASIC' | 'BEARER' | 'NONE';
    httpAuthValue?: string;
    blockingStrategy?: 'COVER' | 'DISCARD' | 'QUEUE';
    timeoutSeconds?: number;
    maxRetryCount?: number;
    retryInterval?: number;
  }

  /** 任务列表查询参数 */
  export interface QueryParams {
    page?: number;
    pageSize?: number;
    name?: string;
    taskGroup?: string;
    enabled?: number;
  }

  /** 日志列表查询参数 */
  export interface QueryLogParams {
    page?: number;
    pageSize?: number;
    taskName?: string;
    status?: string;
    startTimeFrom?: string;
    startTimeTo?: string;
  }

  /** 分页结果 */
  export interface PageResult<T> {
    pageData: T[];
    total: number;
  }
}

// ==================== 任务管理 API ====================

/** 查询定时任务列表 */
export async function getTaskListApi(params: ScheduledTaskApi.QueryParams) {
  return requestClient.get<
    ScheduledTaskApi.PageResult<ScheduledTaskApi.ScheduledTask>
  >('/scheduled-task', { params });
}

/** 创建定时任务 */
export async function createTaskApi(data: ScheduledTaskApi.CreateParams) {
  return requestClient.post<ScheduledTaskApi.ScheduledTask>(
    '/scheduled-task',
    data,
  );
}

/** 更新定时任务 */
export async function updateTaskApi(
  id: number,
  data: ScheduledTaskApi.UpdateParams,
) {
  return requestClient.patch<ScheduledTaskApi.ScheduledTask>(
    `/scheduled-task/${id}`,
    data,
  );
}

/** 删除定时任务 */
export async function deleteTaskApi(id: number) {
  return requestClient.delete<boolean>(`/scheduled-task/${id}`);
}

/** 启用定时任务 */
export async function enableTaskApi(id: number) {
  return requestClient.patch<ScheduledTaskApi.ScheduledTask>(
    `/scheduled-task/${id}/enable`,
  );
}

/** 停用定时任务 */
export async function disableTaskApi(id: number) {
  return requestClient.patch<ScheduledTaskApi.ScheduledTask>(
    `/scheduled-task/${id}/disable`,
  );
}

/** 手动触发执行定时任务 */
export async function triggerTaskApi(id: number) {
  return requestClient.post(`/scheduled-task/${id}/trigger`);
}

/** 获取已注册的 Handler 列表 */
export async function getHandlersApi() {
  return requestClient.get<string[]>('/scheduled-task/handlers');
}

// ==================== 任务日志 API ====================

/** 查询任务执行日志列表 */
export async function getTaskLogsApi(params: ScheduledTaskApi.QueryLogParams) {
  return requestClient.get<
    ScheduledTaskApi.PageResult<ScheduledTaskApi.TaskLog>
  >('/scheduled-task-log', { params });
}

/** 删除指定任务的所有执行日志 */
export async function deleteTaskLogsApi(taskId: number) {
  return requestClient.delete<boolean>(`/scheduled-task-log/task/${taskId}`);
}

/** 清空所有任务执行日志 */
export async function clearAllLogsApi() {
  return requestClient.delete<boolean>('/scheduled-task-log/all');
}
