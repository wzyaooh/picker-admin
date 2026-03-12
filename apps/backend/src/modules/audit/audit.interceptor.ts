import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { catchError, finalize, throwError } from 'rxjs';
import { randomUUID } from 'crypto';
import { AuditService } from './audit.service';
import { SecurityConfigService } from '../security-config/security-config.service';

type AuditMetadata = {
  enabled?: boolean;
  action?: string;
  description?: string; // 接口中文描述
  saveReqBody?: boolean;
  saveResBody?: boolean;
};

// 默认敏感字段列表
const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'oldPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'secret',
];

// 脱敏函数
function maskSensitiveData(obj: any, sensitiveFields: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveData(item, sensitiveFields));
  }

  const masked = { ...obj };
  for (const key of Object.keys(masked)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      masked[key] = '***';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key], sensitiveFields);
    }
  }
  return masked;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private configCache: {
    sensitiveFields: string[];
    ignorePaths: string[];
    lastUpdate: number;
  } | null = null;

  private readonly CACHE_TTL = 60000; // 缓存 1 分钟

  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
    private securityConfigService: SecurityConfigService,
  ) {}

  /**
   * 获取审计配置（敏感字段 + 忽略路径，带缓存）
   */
  private async getAuditConfig(): Promise<{ sensitiveFields: string[]; ignorePaths: string[] }> {
    const now = Date.now();

    // 检查缓存是否有效
    if (this.configCache && now - this.configCache.lastUpdate < this.CACHE_TTL) {
      return this.configCache;
    }

    try {
      const config = await this.securityConfigService.getConfig();
      const fields = config.auditPolicy?.sensitiveFields || DEFAULT_SENSITIVE_FIELDS;
      const paths = config.auditPolicy?.ignorePaths || [];

      this.configCache = {
        sensitiveFields: fields,
        ignorePaths: paths,
        lastUpdate: now,
      };

      return this.configCache;
    } catch {
      return {
        sensitiveFields: DEFAULT_SENSITIVE_FIELDS,
        ignorePaths: [],
      };
    }
  }

  /**
   * 获取敏感字段列表（带缓存）
   */
  private async getSensitiveFields(): Promise<string[]> {
    const config = await this.getAuditConfig();
    return config.sensitiveFields;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const enabled = process.env.AUDIT_ENABLED !== 'false';
    if (!enabled) return next.handle();

    const auditMeta =
      this.reflector.get<AuditMetadata>('audit', context.getHandler()) ??
      this.reflector.get<AuditMetadata>('audit', context.getClass());

    if (auditMeta?.enabled === false) return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const auditConfig = await this.getAuditConfig();
    if (auditConfig.ignorePaths.includes(req.path)) return next.handle();

    const start = Date.now();
    const requestId = randomUUID();

    const cls = context.getClass();
    const handler = context.getHandler();

    let err: any;

    // 获取敏感字段列表
    const sensitiveFields = await this.getSensitiveFields();

    // 获取真实 IP 地址
    const getClientIp = (request: Request): string => {
      // 优先从代理头部获取
      const xForwardedFor = request.headers['x-forwarded-for'];
      if (xForwardedFor) {
        // X-Forwarded-For 可能包含多个 IP，取第一个
        const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
        const ip = ips.split(',')[0].trim();
        return ip === '::1' ? '127.0.0.1' : ip;
      }

      const xRealIp = request.headers['x-real-ip'];
      if (xRealIp) {
        const ip = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
        return ip === '::1' ? '127.0.0.1' : ip;
      }

      // 使用 Express 的 req.ip（需要配置 trust proxy）
      if (request.ip) {
        // 移除 IPv6 前缀并转换 localhost
        const ip = request.ip.replace(/^::ffff:/, '');
        return ip === '::1' ? '127.0.0.1' : ip;
      }

      // 兜底使用 socket 地址
      const socketIp = request.socket.remoteAddress?.replace(/^::ffff:/, '') || 'unknown';
      return socketIp === '::1' ? '127.0.0.1' : socketIp;
    };

    return next.handle().pipe(
      catchError((e) => {
        err = e;
        return throwError(() => e);
      }),
      finalize(() => {
        const durationMs = Date.now() - start;
        const user: any = (req as any).user;

        const saveBody = process.env.AUDIT_SAVE_BODY === 'true';
        const saveReqBody = saveBody && auditMeta?.saveReqBody === true;
        const saveResBody = saveBody && auditMeta?.saveResBody === true;

        const statusCode = res.statusCode;
        const success = err ? 0 : 1;

        const errorCode = err?.code ?? err?.response?.code;
        const errorMessage = err?.message ?? err?.response?.message;

        const log: any = {
          requestId,
          durationMs,
          method: req.method,
          path: req.originalUrl ?? req.url,
          controller: cls?.name,
          handler: handler?.name,
          ip: getClientIp(req),
          userAgent: req.headers['user-agent'],
          userId: user?.userId,
          username: user?.username,
          currentRoleCode: user?.currentRoleCode,
          action: auditMeta?.action,
          description: auditMeta?.description, // 保存接口中文描述
          success,
          statusCode,
          errorCode,
          errorMessage: errorMessage ? String(errorMessage) : undefined,
          reqQuery: JSON.stringify(maskSensitiveData(req.query ?? {}, sensitiveFields)),
          reqParams: JSON.stringify(maskSensitiveData((req as any).params ?? {}, sensitiveFields)),
        };

        if (saveReqBody) {
          log.reqBody = JSON.stringify(maskSensitiveData((req as any).body ?? {}, sensitiveFields));
        }
        if (saveResBody) log.resBody = undefined;

        void this.auditService.write(log);
      }),
    );
  }
}
