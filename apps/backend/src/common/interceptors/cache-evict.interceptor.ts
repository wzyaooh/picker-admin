import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { RedisService } from '@/shared/redis.service';

/**
 * 缓存清除拦截器
 * 在方法执行成功后清除指定的缓存键
 */
@Injectable()
export class CacheEvictInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 拦截请求并在执行后清除缓存
   * @param context 执行上下文
   * @param next 调用处理器
   * @returns Observable 响应流
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const cacheEvictKeys = this.reflector.get<string[]>('cache_evict_keys', context.getHandler());

    // 如果没有要清除的缓存键，直接执行方法
    if (!cacheEvictKeys || cacheEvictKeys.length === 0) {
      return next.handle();
    }

    // 执行方法后清除缓存
    return next.handle().pipe(
      tap(async () => {
        try {
          // 清除所有指定的缓存键
          await Promise.all(cacheEvictKeys.map((key) => this.redisService.del(key)));
        } catch (error) {
          console.error('Cache evict error:', error);
        }
      }),
    );
  }
}
