import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as os from 'os';

import { RedisService } from '@/shared/redis.service';

/**
 * 健康检查控制器
 * 提供系统健康状态检查和环境信息查询功能
 */
@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 系统健康检查
   * 检查数据库连接、Redis连接、系统资源使用情况等
   * @returns 系统健康状态信息
   */
  @Get()
  @ApiOperation({ summary: '系统健康检查' })
  async check(): Promise<any> {
    const startedAt = Date.now();

    const db: { ok: boolean; durationMs: number; error?: string } = {
      ok: true,
      durationMs: 0,
    };

    const redis: { ok: boolean; durationMs: number; error?: string } = {
      ok: true,
      durationMs: 0,
    };

    const dbStart = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
    } catch (e: any) {
      db.ok = false;
      db.error = e?.message ? String(e.message) : 'DB_ERROR';
    } finally {
      db.durationMs = Date.now() - dbStart;
    }

    const redisStart = Date.now();
    try {
      await this.redisService.ping();
    } catch (e: any) {
      redis.ok = false;
      redis.error = e?.message ? String(e.message) : 'REDIS_ERROR';
    } finally {
      redis.durationMs = Date.now() - redisStart;
    }

    const ok = db.ok && redis.ok;

    // 内存信息
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemoryPercent = ((totalMemory - freeMemory) / totalMemory) * 100;

    return {
      status: ok ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      durationMs: Date.now() - startedAt,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: db,
        redis,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpus: os.cpus().length,
        memory: {
          total: Math.round(totalMemory / 1024 / 1024),
          free: Math.round(freeMemory / 1024 / 1024),
          used: Math.round((totalMemory - freeMemory) / 1024 / 1024),
          usedPercent: usedMemoryPercent.toFixed(2),
          unit: 'MB',
        },
        process: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          unit: 'MB',
        },
      },
    };
  }

  /**
   * 获取环境信息
   * 获取当前环境配置信息，包括是否为预览环境等
   * @returns 环境配置信息
   */
  @Get('env')
  @ApiOperation({ summary: '获取环境信息' })
  getEnvironment(): any {
    return {
      isPreview: this.configService.get('IS_PREVIEW') === 'true',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };
  }
}
