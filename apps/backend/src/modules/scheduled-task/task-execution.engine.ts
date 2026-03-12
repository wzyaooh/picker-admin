import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ScheduledTask, ScheduledTaskLog } from './entities';
import { TaskHandlerRegistry } from './task-handler.registry';

@Injectable()
export class TaskExecutionEngine {
  private readonly logger = new Logger(TaskExecutionEngine.name);
  private readonly runningTasks = new Map<number, AbortController>();

  constructor(
    @InjectRepository(ScheduledTask)
    private readonly taskRepo: Repository<ScheduledTask>,
    @InjectRepository(ScheduledTaskLog)
    private readonly logRepo: Repository<ScheduledTaskLog>,
    private readonly handlerRegistry: TaskHandlerRegistry,
  ) {}

  /**
   * 主执行方法
   */
  async execute(
    task: ScheduledTask,
    triggeredBy: 'MANUAL' | 'SCHEDULE',
  ): Promise<void> {
    // 检查阻塞策略
    const canProceed = await this.handleBlockingStrategy(task);
    if (!canProceed) {
      this.logger.log(
        `Task [${task.name}] discarded due to blocking strategy`,
      );
      return;
    }

    const abortController = new AbortController();
    this.runningTasks.set(task.id, abortController);

    const startTime = new Date();
    let status: 'FAIL' | 'SUCCESS' | 'TIMEOUT' = 'SUCCESS';
    let result: string | undefined;
    let errorMessage: string | undefined;
    let retryCount = 0;

    try {
      const executeFn = () => this.executeTask(task);
      const executeWithTimeout =
        task.timeoutSeconds > 0
          ? () =>
              this.withTimeout(
                executeFn(),
                task.timeoutSeconds * 1000,
                abortController.signal,
              )
          : executeFn;

      // 执行（含重试逻辑）
      const retryResult = await this.executeWithRetry(
        task,
        executeWithTimeout,
        abortController.signal,
      );
      result = retryResult.result;
      retryCount = retryResult.retryCount;
    } catch (error) {
      if (error instanceof TimeoutError) {
        status = 'TIMEOUT';
        errorMessage = `Execution timed out after ${task.timeoutSeconds}s`;
      } else {
        status = 'FAIL';
        errorMessage =
          error instanceof Error ? error.message : String(error);
      }
    } finally {
      this.runningTasks.delete(task.id);
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    // 记录执行日志
    await this.saveLog({
      taskId: task.id,
      taskName: task.name,
      triggeredBy,
      startTime,
      endTime,
      durationMs,
      status,
      result,
      errorMessage,
      retryCount,
    });

    // 更新上次执行时间
    await this.taskRepo.update(task.id, { lastExecuteTime: startTime });
  }

  /**
   * 根据任务类型执行
   */
  private async executeTask(task: ScheduledTask): Promise<string> {
    if (task.taskType === 'LOCAL') {
      return this.executeLocal(task.handlerName, task.taskParams);
    }
    return this.executeHttp(task);
  }

  /**
   * 本地 handler 执行
   */
  private async executeLocal(
    handlerName: string,
    params: string,
  ): Promise<string> {
    const handler = this.handlerRegistry.getHandler(handlerName);
    if (!handler) {
      throw new Error(`Handler not found: ${handlerName}`);
    }

    let parsedParams: any;
    try {
      parsedParams = params ? JSON.parse(params) : undefined;
    } catch {
      parsedParams = params;
    }

    const result = await handler.instance[handler.method](parsedParams);
    return result != null ? String(result) : '';
  }

  /**
   * HTTP 请求执行
   */
  private async executeHttp(task: ScheduledTask): Promise<string> {
    const url = task.handlerName;
    const method = task.httpMethod || 'POST';
    const timeoutMs = task.timeoutSeconds * 1000;
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    try {
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 合并自定义请求头
      if (task.httpHeaders) {
        try {
          const customHeaders = JSON.parse(task.httpHeaders);
          Object.assign(headers, customHeaders);
        } catch {
          this.logger.warn(`Invalid httpHeaders JSON for task [${task.name}]`);
        }
      }

      // 添加认证头
      if (task.httpAuthType && task.httpAuthType !== 'NONE' && task.httpAuthValue) {
        switch (task.httpAuthType) {
          case 'BEARER': {
            headers['Authorization'] = `Bearer ${task.httpAuthValue}`;
            break;
          }
          case 'BASIC': {
            headers['Authorization'] = `Basic ${task.httpAuthValue}`;
            break;
          }
          case 'API_KEY': {
            headers['X-API-Key'] = task.httpAuthValue;
            break;
          }
        }
      }

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      // GET/DELETE 不发送 body
      if (method !== 'GET' && method !== 'DELETE') {
        fetchOptions.body = task.taskParams || '{}';
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(
          `HTTP request failed with status ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.text();
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(
          `HTTP request timed out after ${timeoutMs}ms`,
        );
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  /**
   * 阻塞策略处理
   * @returns true 表示可以继续执行，false 表示应跳过
   */
  private async handleBlockingStrategy(
    task: ScheduledTask,
  ): Promise<boolean> {
    const running = this.runningTasks.get(task.id);
    if (!running) return true;

    switch (task.blockingStrategy) {
      case 'DISCARD': {
        // 丢弃本次触发
        return false;
      }
      case 'COVER': {
        // 终止上一次执行，启动新的
        running.abort();
        this.runningTasks.delete(task.id);
        return true;
      }
      case 'QUEUE': {
        // 等待上一次完成
        await this.waitForCompletion(task.id);
        return true;
      }
      default:
        return true;
    }
  }

  /**
   * 等待任务完成（QUEUE 策略）
   */
  private async waitForCompletion(
    taskId: number,
    pollIntervalMs = 500,
    maxWaitMs = 300_000,
  ): Promise<void> {
    const start = Date.now();
    while (this.runningTasks.has(taskId)) {
      if (Date.now() - start > maxWaitMs) {
        throw new Error(
          `Queue wait timeout: task ${taskId} did not complete within ${maxWaitMs}ms`,
        );
      }
      await this.sleep(pollIntervalMs);
    }
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry(
    task: ScheduledTask,
    executeFn: () => Promise<string>,
    signal: AbortSignal,
  ): Promise<{ result: string | undefined; retryCount: number }> {
    let lastError: Error | null = null;
    const maxAttempts = task.maxRetryCount + 1; // 首次执行 + 重试次数

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (signal.aborted) {
        throw new Error('Execution aborted');
      }

      try {
        const result = await executeFn();
        return { result, retryCount: attempt };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 超时错误不重试
        if (error instanceof TimeoutError) {
          throw error;
        }

        const isLastAttempt = attempt >= task.maxRetryCount;
        if (isLastAttempt) break;

        this.logger.warn(
          `Task [${task.name}] attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${task.retryInterval}s...`,
        );

        if (task.retryInterval > 0) {
          await this.sleep(task.retryInterval * 1000);
        }
      }
    }

    throw lastError;
  }

  /**
   * 超时控制
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    signal: AbortSignal,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new TimeoutError(`Execution timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        // 如果已经 abort，清理 timer
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
          },
          { once: true },
        );
      }),
    ]);
  }

  /**
   * 保存执行日志
   */
  private async saveLog(
    data: Partial<ScheduledTaskLog>,
  ): Promise<void> {
    try {
      const log = this.logRepo.create(data);
      await this.logRepo.save(log);
    } catch (error) {
      this.logger.error(
        `Failed to save execution log for task ${data.taskName}: ${error}`,
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 自定义超时错误
 */
class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}
