import { SetMetadata } from '@nestjs/common';

/** 缓存键元数据标识 */
export const CACHE_KEY_METADATA = 'cache_key';

/** 缓存过期时间元数据标识 */
export const CACHE_TTL_METADATA = 'cache_ttl';

/**
 * 缓存装饰器
 * 用于缓存方法的返回结果
 * @param key 缓存键
 * @param ttl 过期时间（秒），默认 300 秒（5 分钟）
 * @returns 装饰器函数
 */
export const Cacheable = (key: string, ttl = 300) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyKey, descriptor);
    return descriptor;
  };
};

/**
 * 缓存清除装饰器
 * 用于在方法执行后清除指定的缓存键
 * @param keys 要清除的缓存键数组
 * @returns 装饰器函数
 */
export const CacheEvict = (...keys: string[]) => {
  return SetMetadata('cache_evict_keys', keys);
};
