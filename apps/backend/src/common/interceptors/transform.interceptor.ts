import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, map } from 'rxjs';

import { ReturnType } from '@/types';

/**
 * 响应转换拦截器
 * 将方法返回值转换为统一的响应格式
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  /**
   * 拦截请求并转换响应格式
   * @param context 执行上下文
   * @param next 调用处理器
   * @returns Observable 响应流
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const returnType = this.reflector.get<ReturnType>('returnType', context.getHandler());
    const req = context.getArgByIndex(1).req as Request;
    
    return next.handle().pipe(
      map((data) => {
        switch (returnType) {
          case 'primitive':
            // 原始类型，不包装
            return data;
          default:
            // 包装为统一响应格式
            return {
              code: 0,
              message: 'OK',
              data,
              originUrl: req.originalUrl,
            };
        }
      }),
    );
  }
}
