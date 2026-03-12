import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {
  @Inject('REDIS_CLIENT')
  private redisClient: RedisClientType;

  async ping() {
    return await this.redisClient.ping();
  }

  async get(key: string) {
    return await this.redisClient.get(key);
  }

  async set(key: string, value: string | number, ttl?: number) {
    await this.redisClient.set(key, value);

    if (ttl) {
      await this.redisClient.expire(key, ttl);
    }
  }

  async del(key: string) {
    await this.redisClient.del(key);
    return true;
  }

  async sadd(key: string, value: string | number) {
    return await this.redisClient.sAdd(key, value.toString());
  }

  async srem(key: string, value: string | number) {
    return await this.redisClient.sRem(key, value.toString());
  }

  async smembers(key: string) {
    return await this.redisClient.sMembers(key);
  }

  async incr(key: string) {
    return await this.redisClient.incr(key);
  }

  async setex(key: string, ttl: number, value: string | number) {
    return await this.redisClient.setEx(key, ttl, value.toString());
  }

  async expire(key: string, ttl: number) {
    return await this.redisClient.expire(key, ttl);
  }

  async ttl(key: string) {
    return await this.redisClient.ttl(key);
  }

  async hashGet(key: string) {
    return await this.redisClient.hGetAll(key);
  }

  async hashSet(key: string, obj: Record<string, any>, ttl?: number) {
    for (const name in obj) {
      await this.redisClient.hSet(key, name, obj[name]);
    }

    if (ttl) {
      await this.redisClient.expire(key, ttl);
    }
  }

  // List operations
  async lpush(key: string, value: string | number) {
    return await this.redisClient.lPush(key, value.toString());
  }

  async ltrim(key: string, start: number, stop: number) {
    return await this.redisClient.lTrim(key, start, stop);
  }

  async lrange(key: string, start: number, stop: number) {
    return await this.redisClient.lRange(key, start, stop);
  }
}
