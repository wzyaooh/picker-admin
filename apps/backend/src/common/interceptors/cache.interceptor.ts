import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { RedisService } from '@/shared/redis.service';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '@/common/decorators/cache.decorator';

/**
 * 缓存拦截器
 * 在方法执行前尝试从缓存获取结果，执行后将结果缓存
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 拦截请求并处理缓存
   * @param context 执行上下文
   * @param next 调用处理器
   * @returns Promise<Observable> 响应流
   */
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());
    const cacheTTL = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());

    // 如果没有缓存键，直接执行方法
    if (!cacheKey) {
      return next.handle();
    }

    // 尝试从缓存获取
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        const parsedData = JSON.parse(cached);
        return of(parsedData);
      } catch (error) {
        // 如果解析失败，继续执行方法
        console.error('Cache parse error:', error);
      }
    }

    // 执行方法并缓存结果
    return next.handle().pipe(
      tap(async (data) => {
        try {
          await this.redisService.set(cacheKey, JSON.stringify(data), cacheTTL);
        } catch (error) {
          console.error('Cache set error:', error);
        }
      }),
    );
  }
}
