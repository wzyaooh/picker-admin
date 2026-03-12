import { SetMetadata } from '@nestjs/common';

/**
 * 审计日志选项
 */
export type AuditOptions = {
  /** 是否启用审计 */
  enabled?: boolean;
  /** 操作动作 */
  action?: string;
  /** 接口中文描述 */
  description?: string;
  /** 是否保存请求体 */
  saveReqBody?: boolean;
  /** 是否保存响应体 */
  saveResBody?: boolean;
};

/**
 * 审计日志装饰器
 * 用于标记需要记录审计日志的接口
 * @param options 审计选项
 * @returns 装饰器函数
 */
export const Audit = (options: AuditOptions = {}) => SetMetadata('audit', options);
