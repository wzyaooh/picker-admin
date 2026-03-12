import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@/shared/redis.service';
import { SecurityConfig as SecurityConfigEntity } from './entities';
import type {
  AccountLockoutConfig,
  AuditConfig,
  EmailConfig,
  PasswordPolicyConfig,
  SecurityConfig,
  UpdateSecurityConfig,
} from './interfaces/security-config.interface';
import {
  DEFAULT_ACCOUNT_LOCKOUT,
  DEFAULT_AUDIT_POLICY,
  DEFAULT_EMAIL_CONFIG,
  DEFAULT_PASSWORD_POLICY,
} from './constants/default-config';

/**
 * 安全配置服务
 * 负责管理系统安全相关的配置，包括密码策略、账号锁定、审计日志等
 * 数据库为唯一真实来源，Redis 作为性能缓存层
 */
@Injectable()
export class SecurityConfigService {
  private readonly logger = new Logger(SecurityConfigService.name);
  private readonly CONFIG_PREFIX = 'security:config:';
  private readonly CACHE_TTL = 3600; // 缓存1小时

  constructor(
    @InjectRepository(SecurityConfigEntity)
    private readonly configRepo: Repository<SecurityConfigEntity>,
    private readonly redisService: RedisService,
  ) {}

  // ==================== 通用私有方法 ====================

  /**
   * 通用配置读取：Redis 缓存 → 数据库 → 默认值（自动修复）
   */
  private async getConfigByGroup<T>(
    group: string,
    defaultConfig: T,
    description: string,
  ): Promise<T> {
    const cacheKey = `${this.CONFIG_PREFIX}${group}`;

    // 1. 尝试从 Redis 缓存读取
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      this.logger.warn(`Failed to read ${group} from Redis: ${error.message}`);
    }

    // 2. 从数据库读取
    let config: T;
    try {
      const entity = await this.configRepo.findOne({ where: { configGroup: group } });

      if (entity) {
        config = entity.configData as T;
      } else {
        // DB 记录不存在（被误删），回退默认值并自动修复
        this.logger.warn(`Config group "${group}" not found in DB, inserting default`);
        config = { ...defaultConfig };
        await this.configRepo.save(
          this.configRepo.create({
            configGroup: group,
            configData: config as Record<string, any>,
            description,
          }),
        );
      }
    } catch (dbError) {
      this.logger.error(`Failed to read ${group} from DB: ${dbError.message}`);
      throw dbError;
    }

    // 3. 写入 Redis 缓存
    try {
      await this.redisService.set(cacheKey, JSON.stringify(config), this.CACHE_TTL);
    } catch (error) {
      this.logger.warn(`Failed to cache ${group}: ${error.message}`);
    }

    return config;
  }

  /**
   * 通用配置更新：读取当前 → 合并 → 验证 → 写 DB → 删缓存
   */
  private async updateConfigByGroup<T extends Record<string, any>>(
    group: string,
    partialUpdate: Partial<T>,
    validator: (config: T) => void,
    description: string,
    defaultConfig: T,
  ): Promise<void> {
    // 1. 从数据库读取当前配置
    let currentConfig: T;
    const entity = await this.configRepo.findOne({ where: { configGroup: group } });

    if (entity) {
      currentConfig = entity.configData as T;
    } else {
      currentConfig = { ...defaultConfig };
    }

    // 2. 合并
    const mergedConfig = { ...currentConfig, ...partialUpdate };

    // 3. 验证
    validator(mergedConfig);

    // 4. 写入数据库
    if (entity) {
      entity.configData = mergedConfig as Record<string, any>;
      await this.configRepo.save(entity);
    } else {
      await this.configRepo.save(
        this.configRepo.create({
          configGroup: group,
          configData: mergedConfig as Record<string, any>,
          description,
        }),
      );
    }

    // 5. 删除缓存（DB 写入成功后才执行）
    const cacheKey = `${this.CONFIG_PREFIX}${group}`;
    try {
      await this.redisService.del(cacheKey);
    } catch (error) {
      this.logger.warn(`Failed to delete cache for ${group}: ${error.message}`);
    }

    this.logger.log(`${group} updated successfully`);
  }

  // ==================== 配置读取方法 ====================

  /**
   * 获取密码策略配置
   */
  async getPasswordPolicy(): Promise<PasswordPolicyConfig> {
    return this.getConfigByGroup<PasswordPolicyConfig>(
      'password_policy',
      DEFAULT_PASSWORD_POLICY,
      '密码策略配置',
    );
  }

  /**
   * 获取账号锁定配置
   */
  async getAccountLockoutPolicy(): Promise<AccountLockoutConfig> {
    return this.getConfigByGroup<AccountLockoutConfig>(
      'account_lockout',
      DEFAULT_ACCOUNT_LOCKOUT,
      '账号锁定配置',
    );
  }

  /**
   * 获取审计日志配置
   */
  async getAuditPolicy(): Promise<AuditConfig> {
    return this.getConfigByGroup<AuditConfig>(
      'audit_policy',
      DEFAULT_AUDIT_POLICY,
      '审计日志配置',
    );
  }

  /**
   * 获取所有安全配置
   */
  async getAllConfig(): Promise<SecurityConfig> {
    const [passwordPolicy, accountLockout, auditPolicy] = await Promise.all([
      this.getPasswordPolicy(),
      this.getAccountLockoutPolicy(),
      this.getAuditPolicy(),
    ]);

    return {
      passwordPolicy,
      accountLockout,
      auditPolicy,
    };
  }

  /**
   * 获取完整配置（别名方法，用于控制器）
   */
  async getConfig(): Promise<SecurityConfig> {
    return this.getAllConfig();
  }

  /**
   * 获取账号锁定配置（别名方法，用于控制器）
   */
  async getAccountLockout(): Promise<AccountLockoutConfig> {
    return this.getAccountLockoutPolicy();
  }

  // ==================== 配置更新方法 ====================

  /**
   * 更新安全配置
   */
  async updateConfig(config: UpdateSecurityConfig): Promise<SecurityConfig> {
    if (config.passwordPolicy) {
      await this.updatePasswordPolicy(config.passwordPolicy);
    }

    if (config.accountLockout) {
      await this.updateAccountLockoutPolicy(config.accountLockout);
    }

    if (config.auditPolicy) {
      await this.updateAuditPolicy(config.auditPolicy);
    }

    return this.getAllConfig();
  }

  /**
   * 更新密码策略配置
   */
  async updatePasswordPolicy(config: Partial<PasswordPolicyConfig>): Promise<void> {
    await this.updateConfigByGroup<PasswordPolicyConfig>(
      'password_policy',
      config,
      this.validatePasswordPolicy,
      '密码策略配置',
      DEFAULT_PASSWORD_POLICY,
    );
  }

  /**
   * 更新账号锁定配置
   */
  async updateAccountLockoutPolicy(config: Partial<AccountLockoutConfig>): Promise<void> {
    await this.updateConfigByGroup<AccountLockoutConfig>(
      'account_lockout',
      config,
      this.validateAccountLockoutPolicy,
      '账号锁定配置',
      DEFAULT_ACCOUNT_LOCKOUT,
    );
  }

  /**
   * 更新审计日志配置
   */
  async updateAuditPolicy(config: Partial<AuditConfig>): Promise<void> {
    await this.updateConfigByGroup<AuditConfig>(
      'audit_policy',
      config,
      this.validateAuditPolicy,
      '审计日志配置',
      DEFAULT_AUDIT_POLICY,
    );
  }

  // ==================== 重置方法 ====================

  /**
   * 重置为默认配置
   */
  async resetToDefault(): Promise<SecurityConfig> {
    const groups = [
      { group: 'password_policy', config: DEFAULT_PASSWORD_POLICY, description: '密码策略配置' },
      { group: 'account_lockout', config: DEFAULT_ACCOUNT_LOCKOUT, description: '账号锁定配置' },
      { group: 'audit_policy', config: DEFAULT_AUDIT_POLICY, description: '审计日志配置' },
    ];

    // 1. 覆盖数据库中的三组配置
    for (const { group, config, description } of groups) {
      const entity = await this.configRepo.findOne({ where: { configGroup: group } });
      if (entity) {
        entity.configData = config as Record<string, any>;
        await this.configRepo.save(entity);
      } else {
        await this.configRepo.save(
          this.configRepo.create({
            configGroup: group,
            configData: config as Record<string, any>,
            description,
          }),
        );
      }
    }

    // 2. 清除所有相关 Redis 缓存
    const keys = [
      `${this.CONFIG_PREFIX}password_policy`,
      `${this.CONFIG_PREFIX}account_lockout`,
      `${this.CONFIG_PREFIX}audit_policy`,
    ];

    for (const key of keys) {
      try {
        await this.redisService.del(key);
      } catch (error) {
        this.logger.warn(`Failed to delete cache key ${key}: ${error.message}`);
      }
    }

    this.logger.log('Security config reset to default');

    // 3. 返回重置后的配置
    return {
      passwordPolicy: { ...DEFAULT_PASSWORD_POLICY },
      accountLockout: { ...DEFAULT_ACCOUNT_LOCKOUT },
      auditPolicy: { ...DEFAULT_AUDIT_POLICY },
    };
  }

  // ==================== 邮件配置方法 ====================

  /**
   * 获取邮件配置
   */
  async getEmailConfig(): Promise<EmailConfig> {
    return this.getConfigByGroup<EmailConfig>(
      'email_config',
      DEFAULT_EMAIL_CONFIG,
      '邮件配置',
    );
  }

  /**
   * 更新邮件配置
   */
  async updateEmailConfig(config: Partial<EmailConfig>): Promise<EmailConfig> {
    await this.updateConfigByGroup<EmailConfig>(
      'email_config',
      config,
      this.validateEmailConfig,
      '邮件配置',
      DEFAULT_EMAIL_CONFIG,
    );
    return this.getEmailConfig();
  }

  /**
   * 重置邮件配置为默认值
   */
  async resetEmailConfig(): Promise<EmailConfig> {
    const group = 'email_config';
    const entity = await this.configRepo.findOne({ where: { configGroup: group } });
    if (entity) {
      entity.configData = { ...DEFAULT_EMAIL_CONFIG } as Record<string, any>;
      await this.configRepo.save(entity);
    } else {
      await this.configRepo.save(
        this.configRepo.create({
          configGroup: group,
          configData: { ...DEFAULT_EMAIL_CONFIG } as Record<string, any>,
          description: '邮件配置',
        }),
      );
    }

    try {
      await this.redisService.del(`${this.CONFIG_PREFIX}${group}`);
    } catch (error) {
      this.logger.warn(`Failed to delete cache for ${group}: ${error.message}`);
    }

    return { ...DEFAULT_EMAIL_CONFIG };
  }

  // ==================== 验证方法 ====================

  /**
   * 验证密码策略配置
   */
  private validatePasswordPolicy(config: PasswordPolicyConfig): void {
    if (config.minLength < 6 || config.minLength > 32) {
      throw new Error('密码最小长度必须在 6-32 之间');
    }

    if (config.maxLength < 8 || config.maxLength > 128) {
      throw new Error('密码最大长度必须在 8-128 之间');
    }

    if (config.minLength > config.maxLength) {
      throw new Error('密码最小长度不能大于最大长度');
    }

    if (config.expiryDays < 0 || config.expiryDays > 365) {
      throw new Error('密码有效天数必须在 0-365 之间');
    }

    if (config.historyCount < 0 || config.historyCount > 10) {
      throw new Error('历史密码记录数必须在 0-10 之间');
    }
  }

  /**
   * 验证账号锁定配置
   */
  private validateAccountLockoutPolicy(config: AccountLockoutConfig): void {
    if (config.maxAttempts < 3 || config.maxAttempts > 10) {
      throw new Error('最大登录失败次数必须在 3-10 之间');
    }

    if (config.lockoutDuration < 5 || config.lockoutDuration > 1440) {
      throw new Error('账号锁定时长必须在 5-1440 分钟之间');
    }
  }

  /**
   * 验证审计日志配置
   */
  private validateAuditPolicy(config: AuditConfig): void {
    if (config.retentionDays < 7 || config.retentionDays > 365) {
      throw new Error('日志保留天数必须在 7-365 之间');
    }
  }

  /**
   * 验证邮件配置
   */
  private validateEmailConfig(config: EmailConfig): void {
    if (config.port < 1 || config.port > 65535) {
      throw new Error('服务器端口必须在 1-65535 之间');
    }
    if (config.useSsl && (config.sslPort < 1 || config.sslPort > 65535)) {
      throw new Error('SSL端口必须在 1-65535 之间');
    }
  }
}
