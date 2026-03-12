import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { RedisService } from '@/shared/redis.service';
import { CreateApiKeyDto, UpdateApiKeyDto, QueryApiKeyDto } from './dto';
import { ApiKey } from './entities';
import * as crypto from 'crypto';

export interface ApiKeyData {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  expiresAt?: string;
  usageCount: number;
  lastUsedAt?: string;
  enabled: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyWithFullKey extends ApiKeyData {
  fullKey: string;
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 生成 API Key
   */
  async create(createDto: CreateApiKeyDto, createdBy?: number): Promise<ApiKeyWithFullKey> {
    const id = this.generateId();
    const fullKey = this.generateApiKey();
    const keyPrefix = fullKey.substring(0, 20);

    // 检查名称是否重复
    const existingByName = await this.apiKeyRepo.findOne({
      where: { name: createDto.name },
    });
    if (existingByName) {
      throw new CustomException(ErrorCode.ERR_20001, 'API Key 名称已存在');
    }

    const apiKey = this.apiKeyRepo.create({
      id,
      name: createDto.name,
      description: createDto.description,
      keyPrefix,
      fullKey,
      permissions: createDto.permissions,
      rateLimit: createDto.rateLimit || 1000,
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
      usageCount: 0,
      enabled: true,
      createdBy,
    });

    const savedApiKey = await this.apiKeyRepo.save(apiKey);

    this.logger.log(`API Key created: ${id} by user ${createdBy}`);

    return {
      ...this.toApiKeyData(savedApiKey),
      fullKey,
    };
  }

  /**
   * 查询 API Key 列表
   */
  async findAll(query: QueryApiKeyDto): Promise<{ items: ApiKeyData[]; total: number }> {
    const { pageNo = 1, pageSize = 10, keyword } = query;

    const queryBuilder = this.apiKeyRepo.createQueryBuilder('apiKey');

    if (keyword) {
      queryBuilder.where(
        'apiKey.name LIKE :keyword OR apiKey.description LIKE :keyword',
        { keyword: `%${keyword}%` }
      );
    }

    const [items, total] = await queryBuilder
      .orderBy('apiKey.createdAt', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: items.map(item => this.toApiKeyData(item)),
      total,
    };
  }

  /**
   * 根据 ID 查询 API Key
   */
  async findOne(id: string): Promise<ApiKeyData | null> {
    const apiKey = await this.apiKeyRepo.findOne({ where: { id } });
    if (!apiKey) {
      return null;
    }
    return this.toApiKeyData(apiKey);
  }

  /**
   * 验证 API Key
   */
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; data?: ApiKeyData; message?: string }> {
    try {
      if (!apiKey.startsWith('ck_')) {
        return { valid: false, message: 'API Key 格式错误' };
      }

      const keyData = await this.apiKeyRepo.findOne({
        where: { fullKey: apiKey },
      });

      if (!keyData) {
        return { valid: false, message: 'API Key 不存在或已过期' };
      }

      if (!keyData.enabled) {
        return { valid: false, message: 'API Key 已禁用' };
      }

      // 检查过期时间
      if (keyData.expiresAt && keyData.expiresAt < new Date()) {
        return { valid: false, message: 'API Key 已过期' };
      }

      // 更新最后使用时间和使用次数
      await this.updateUsage(keyData.id);

      return { valid: true, data: this.toApiKeyData(keyData) };
    } catch (error) {
      this.logger.error(`API Key validation failed: ${error.message}`);
      return { valid: false, message: '认证服务异常' };
    }
  }

  /**
   * 更新 API Key
   */
  async update(id: string, updateDto: UpdateApiKeyDto): Promise<ApiKeyData> {
    const apiKey = await this.apiKeyRepo.findOne({ where: { id } });
    if (!apiKey) {
      throw new CustomException(ErrorCode.ERR_20002, 'API Key 不存在');
    }

    // 检查名称是否重复（排除自己）
    if (updateDto.name && updateDto.name !== apiKey.name) {
      const existingByName = await this.apiKeyRepo.findOne({
        where: { name: updateDto.name },
      });
      if (existingByName) {
        throw new CustomException(ErrorCode.ERR_20001, 'API Key 名称已存在');
      }
    }

    Object.assign(apiKey, updateDto);
    if (updateDto.expiresAt) {
      apiKey.expiresAt = new Date(updateDto.expiresAt);
    }

    const updatedApiKey = await this.apiKeyRepo.save(apiKey);

    this.logger.log(`API Key updated: ${id}`);

    return this.toApiKeyData(updatedApiKey);
  }

  /**
   * 删除 API Key
   */
  async remove(id: string): Promise<boolean> {
    const result = await this.apiKeyRepo.delete(id);
    
    if (result.affected === 0) {
      return false;
    }

    this.logger.log(`API Key deleted: ${id}`);
    return true;
  }

  /**
   * 检查速率限制
   */
  async checkRateLimit(apiKey: string, apiKeyData: ApiKeyData): Promise<boolean> {
    if (apiKeyData.rateLimit <= 0) {
      return true; // 无限制
    }

    const key = `rate_limit:${apiKeyData.id}`;
    try {
      const current = await this.redisService.get(key);
      
      if (current === null) {
        await this.redisService.setex(key, 3600, '1');
        return true;
      }
      
      if (parseInt(current) >= apiKeyData.rateLimit) {
        return false;
      }
      
      await this.redisService.incr(key);
      return true;
    } catch (error) {
      this.logger.error(`Rate limit check failed: ${error.message}`);
      return true; // 出错时允许通过
    }
  }

  /**
   * 更新使用统计
   */
  private async updateUsage(id: string): Promise<void> {
    try {
      await this.apiKeyRepo.update(id, {
        usageCount: () => 'usageCount + 1',
        lastUsedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Update usage failed: ${error.message}`);
    }
  }

  /**
   * 生成 API Key
   */
  private generateApiKey(): string {
    const randomPart = crypto.randomBytes(32).toString('hex');
    return `ck_live_${randomPart}`;
  }

  /**
   * 生成 ID
   */
  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 重新生成 API Key
   */
  async regenerate(id: string): Promise<ApiKeyWithFullKey> {
    const apiKey = await this.apiKeyRepo.findOne({ where: { id } });
    if (!apiKey) {
      throw new CustomException(ErrorCode.ERR_20002, 'API Key 不存在');
    }

    const newFullKey = this.generateApiKey();
    const newKeyPrefix = newFullKey.substring(0, 20);

    apiKey.fullKey = newFullKey;
    apiKey.keyPrefix = newKeyPrefix;
    apiKey.usageCount = 0;
    apiKey.lastUsedAt = null;

    const updatedApiKey = await this.apiKeyRepo.save(apiKey);

    this.logger.log(`API Key regenerated: ${id}`);

    return {
      ...this.toApiKeyData(updatedApiKey),
      fullKey: newFullKey,
    };
  }

  /**
   * 记录使用统计
   */
  async recordUsage(apiKeyId: string, responseTime: number): Promise<void> {
    try {
      // 更新使用次数
      await this.updateUsage(apiKeyId);

      // 记录响应时间统计到 Redis
      const statsKey = `api_key_stats:${apiKeyId}`;
      const today = new Date().toISOString().split('T')[0];
      const dailyStatsKey = `${statsKey}:${today}`;

      await Promise.all([
        this.redisService.incr(`${dailyStatsKey}:count`),
        this.redisService.lpush(`${dailyStatsKey}:response_times`, responseTime.toString()),
        this.redisService.expire(`${dailyStatsKey}:count`, 86400 * 30), // 30天过期
        this.redisService.expire(`${dailyStatsKey}:response_times`, 86400 * 30),
      ]);

      // 只保留最近100个响应时间
      await this.redisService.ltrim(`${dailyStatsKey}:response_times`, 0, 99);
    } catch (error) {
      this.logger.error(`Record usage failed: ${error.message}`);
    }
  }

  /**
   * 获取使用统计
   */
  async getStats(id: string): Promise<{
    totalRequests: number;
    todayRequests: number;
    avgResponseTime: number;
    lastUsedAt: string | null;
  }> {
    const apiKey = await this.apiKeyRepo.findOne({ where: { id } });
    if (!apiKey) {
      throw new CustomException(ErrorCode.ERR_20002, 'API Key 不存在');
    }

    const today = new Date().toISOString().split('T')[0];
    const dailyStatsKey = `api_key_stats:${id}:${today}`;

    try {
      const [todayCount, responseTimes] = await Promise.all([
        this.redisService.get(`${dailyStatsKey}:count`),
        this.redisService.lrange(`${dailyStatsKey}:response_times`, 0, -1),
      ]);

      const todayRequests = todayCount ? parseInt(todayCount) : 0;
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum: number, time: string) => sum + parseInt(time), 0) / responseTimes.length
        : 0;

      return {
        totalRequests: apiKey.usageCount,
        todayRequests,
        avgResponseTime: Math.round(avgResponseTime),
        lastUsedAt: apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : null,
      };
    } catch (error) {
      this.logger.error(`Get stats failed: ${error.message}`);
      return {
        totalRequests: apiKey.usageCount,
        todayRequests: 0,
        avgResponseTime: 0,
        lastUsedAt: apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : null,
      };
    }
  }

  /**
   * 获取访问日志
   */
  async getLogs(query: {
    apiKeyId?: string;
    pageNo?: number;
    pageSize?: number;
  }): Promise<{
    pageData: Array<{
      id: string;
      method: string;
      path: string;
      statusCode: number;
      responseTime: number;
      ipAddress: string;
      userAgent: string;
      timestamp: string;
    }>;
    total: number;
  }> {
    // 这里可以从 Redis 或者单独的日志表中获取访问日志
    // 暂时返回空数据
    return {
      pageData: [],
      total: 0,
    };
  }

  /**
   * 获取可用权限列表（分组显示，包含具体接口）
   */
  async getAvailablePermissions(): Promise<Array<{
    code: string;
    name: string;
    description: string;
    category: string;
    children?: Array<{
      code: string;
      name: string;
      description: string;
      method: string;
      path: string;
    }>;
  }>> {
    return [
      {
        code: 'crawler:*',
        name: '爬虫全部权限',
        description: '拥有爬虫服务的所有权限',
        category: 'global',
      },
      {
        code: 'crawler:task',
        name: '任务管理',
        description: '任务相关的所有操作权限',
        category: 'task',
        children: [
          {
            code: 'crawler:task:list',
            name: '查看任务列表',
            description: '获取任务列表（分页）',
            method: 'GET',
            path: '/crawler/tasks',
          },
          {
            code: 'crawler:task:detail',
            name: '查看任务详情',
            description: '获取单个任务的详细信息',
            method: 'GET',
            path: '/crawler/tasks/{id}',
          },
          {
            code: 'crawler:task:create',
            name: '创建任务',
            description: '创建新的爬虫任务',
            method: 'POST',
            path: '/crawler/tasks',
          },
          {
            code: 'crawler:task:update',
            name: '更新任务',
            description: '修改任务配置信息',
            method: 'PATCH',
            path: '/crawler/tasks/{id}',
          },
          {
            code: 'crawler:task:delete',
            name: '删除任务',
            description: '删除指定任务',
            method: 'DELETE',
            path: '/crawler/tasks/{id}',
          },
          {
            code: 'crawler:task:run',
            name: '执行任务',
            description: '启动任务执行爬虫',
            method: 'POST',
            path: '/crawler/tasks/{id}/run',
          },
          {
            code: 'crawler:task:stop',
            name: '停止任务',
            description: '停止正在执行的任务',
            method: 'POST',
            path: '/crawler/tasks/{id}/stop',
          },
        ],
      },
      {
        code: 'crawler:result',
        name: '结果管理',
        description: '爬取结果相关的操作权限',
        category: 'result',
        children: [
          {
            code: 'crawler:result:list',
            name: '查看结果列表',
            description: '获取所有爬取结果',
            method: 'GET',
            path: '/crawler/results',
          },
          {
            code: 'crawler:result:task',
            name: '查看任务结果',
            description: '获取指定任务的爬取结果',
            method: 'GET',
            path: '/crawler/tasks/{id}/results',
          },
          {
            code: 'crawler:result:delete',
            name: '删除单个结果',
            description: '删除指定的爬取结果',
            method: 'DELETE',
            path: '/crawler/results/{id}',
          },
          {
            code: 'crawler:result:clear',
            name: '清空任务结果',
            description: '清空指定任务的所有结果',
            method: 'DELETE',
            path: '/crawler/tasks/{id}/results',
          },
          {
            code: 'crawler:result:dedup',
            name: '清空去重缓存',
            description: '清空任务的去重缓存',
            method: 'DELETE',
            path: '/crawler/tasks/{id}/dedup',
          },
        ],
      },
      {
        code: 'crawler:spider',
        name: '爬虫管理',
        description: '爬虫相关的操作权限',
        category: 'spider',
        children: [
          {
            code: 'crawler:spider:list',
            name: '查看爬虫列表',
            description: '获取所有可用的爬虫',
            method: 'GET',
            path: '/crawler/spiders',
          },
          {
            code: 'crawler:spider:test',
            name: '测试爬虫',
            description: '测试爬虫功能（同步执行）',
            method: 'POST',
            path: '/crawler/spiders/test',
          },
        ],
      },
      {
        code: 'crawler:article',
        name: '文章管理',
        description: '文章相关的操作权限',
        category: 'article',
        children: [
          {
            code: 'crawler:article:list',
            name: '查看文章列表',
            description: '获取文章列表（分页搜索）',
            method: 'GET',
            path: '/crawler/articles',
          },
          {
            code: 'crawler:article:detail',
            name: '查看文章详情',
            description: '获取文章完整内容',
            method: 'GET',
            path: '/crawler/articles/{id}',
          },
          {
            code: 'crawler:article:by-result',
            name: '根据结果查看文章',
            description: '根据爬取结果ID获取关联文章',
            method: 'GET',
            path: '/crawler/articles/result/{id}',
          },
          {
            code: 'crawler:article:by-task',
            name: '查看任务文章',
            description: '获取任务下的所有文章',
            method: 'GET',
            path: '/crawler/articles/task/{id}',
          },
          {
            code: 'crawler:article:versions',
            name: '查看文章版本',
            description: '获取文章的所有版本',
            method: 'GET',
            path: '/crawler/articles/{id}/versions',
          },
          {
            code: 'crawler:article:delete',
            name: '删除文章',
            description: '删除指定文章',
            method: 'DELETE',
            path: '/crawler/articles/{id}',
          },
          {
            code: 'crawler:article:delete-task',
            name: '删除任务文章',
            description: '删除任务下所有文章',
            method: 'DELETE',
            path: '/crawler/articles/task/{id}',
          },
          {
            code: 'crawler:article:polish',
            name: '文章润色',
            description: '对文章执行AI润色',
            method: 'POST',
            path: '/crawler/articles/{id}/polish',
          },
          {
            code: 'crawler:article:polish-status',
            name: '查看润色状态',
            description: '查询文章润色进度',
            method: 'GET',
            path: '/crawler/articles/{id}/polish/status',
          },
          {
            code: 'crawler:article:set-latest',
            name: '设置最新版本',
            description: '设置文章的最新版本',
            method: 'PATCH',
            path: '/crawler/articles/{id}/set-latest',
          },
        ],
      },
      {
        code: 'crawler:enrich',
        name: '内容增强',
        description: 'LLM内容增强相关的操作权限',
        category: 'enrich',
        children: [
          {
            code: 'crawler:enrich:single',
            name: '单条结果增强',
            description: '对单条爬取结果进行LLM增强',
            method: 'POST',
            path: '/crawler/enrich/{id}',
          },
          {
            code: 'crawler:enrich:task',
            name: '批量任务增强',
            description: '对任务的所有结果进行批量增强',
            method: 'POST',
            path: '/crawler/enrich/task/{id}',
          },
          {
            code: 'crawler:enrich:get',
            name: '获取增强结果',
            description: '获取单条增强结果',
            method: 'GET',
            path: '/crawler/enrich/result/{id}',
          },
          {
            code: 'crawler:enrich:list',
            name: '获取增强列表',
            description: '获取任务的增强结果列表',
            method: 'GET',
            path: '/crawler/enrich/task/{id}/list',
          },
          {
            code: 'crawler:enrich:status',
            name: '查看增强状态',
            description: '获取任务下所有结果的增强状态',
            method: 'GET',
            path: '/crawler/enrich/task/{id}/status',
          },
          {
            code: 'crawler:enrich:single-status',
            name: '查看单条增强状态',
            description: '检查单条结果是否正在增强',
            method: 'GET',
            path: '/crawler/enrich/{id}/enriching',
          },
          {
            code: 'crawler:enrich:task-status',
            name: '查看任务增强状态',
            description: '检查任务是否正在增强',
            method: 'GET',
            path: '/crawler/enrich/task/{id}/enriching',
          },
          {
            code: 'crawler:enrich:stop-single',
            name: '停止单条增强',
            description: '停止单条结果的增强过程',
            method: 'POST',
            path: '/crawler/enrich/{id}/stop',
          },
          {
            code: 'crawler:enrich:stop-task',
            name: '停止批量增强',
            description: '停止任务的批量增强过程',
            method: 'POST',
            path: '/crawler/enrich/task/{id}/stop',
          },
          {
            code: 'crawler:enrich:delete',
            name: '删除增强结果',
            description: '删除单条增强结果',
            method: 'DELETE',
            path: '/crawler/enrich/{id}',
          },
          {
            code: 'crawler:enrich:delete-task',
            name: '删除任务增强',
            description: '删除任务的所有增强结果',
            method: 'DELETE',
            path: '/crawler/enrich/task/{id}',
          },
        ],
      },
      {
        code: 'crawler:stats',
        name: '统计分析',
        description: '统计信息相关的查询权限',
        category: 'stats',
        children: [
          {
            code: 'crawler:stats:global',
            name: '全局统计',
            description: '获取爬虫服务的全局统计信息',
            method: 'GET',
            path: '/crawler/stats',
          },
          {
            code: 'crawler:stats:task',
            name: '任务统计',
            description: '获取指定任务的统计信息',
            method: 'GET',
            path: '/crawler/tasks/{id}/stats',
          },
        ],
      },
    ];
  }

  /**
   * 转换实体为 API 数据格式
   */
  private toApiKeyData(apiKey: ApiKey): ApiKeyData {
    return {
      id: apiKey.id,
      name: apiKey.name,
      description: apiKey.description,
      keyPrefix: apiKey.keyPrefix,
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
      expiresAt: apiKey.expiresAt ? apiKey.expiresAt.toISOString() : undefined,
      usageCount: apiKey.usageCount,
      lastUsedAt: apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : undefined,
      enabled: apiKey.enabled,
      createdBy: apiKey.createdBy,
      createdAt: apiKey.createdAt.toISOString(),
      updatedAt: apiKey.updatedAt.toISOString(),
    };
  }
}
