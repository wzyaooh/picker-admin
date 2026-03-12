import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SecurityConfig as SecurityConfigEntity } from './entities';
import { SecurityConfigService } from './security-config.service';
import {
  DEFAULT_PASSWORD_POLICY,
  DEFAULT_ACCOUNT_LOCKOUT,
  DEFAULT_AUDIT_POLICY,
} from './constants/default-config';

/** 需要播种的配置组定义 */
const SEED_CONFIGS = [
  {
    configGroup: 'password_policy',
    configData: DEFAULT_PASSWORD_POLICY,
    description: '密码策略配置',
  },
  {
    configGroup: 'account_lockout',
    configData: DEFAULT_ACCOUNT_LOCKOUT,
    description: '账号锁定配置',
  },
  {
    configGroup: 'audit_policy',
    configData: DEFAULT_AUDIT_POLICY,
    description: '审计日志配置',
  },
] as const;

/**
 * 安全配置初始化服务
 * 在应用启动时检查数据库并播种缺失的默认配置
 */
@Injectable()
export class SecurityConfigInitService implements OnModuleInit {
  private readonly logger = new Logger(SecurityConfigInitService.name);

  constructor(
    @InjectRepository(SecurityConfigEntity)
    private readonly securityConfigRepo: Repository<SecurityConfigEntity>,
    private readonly securityConfigService: SecurityConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeConfig();
  }

  /**
   * 初始化配置
   * 查询数据库中已存在的配置组，仅为缺失的配置组插入默认值
   */
  async initializeConfig(): Promise<void> {
    try {
      this.logger.log('Initializing security configuration...');

      const existingConfigs = await this.securityConfigRepo.find({
        select: ['configGroup'],
      });
      const existingGroups = new Set(
        existingConfigs.map((c) => c.configGroup),
      );

      const missingConfigs = SEED_CONFIGS.filter(
        (seed) => !existingGroups.has(seed.configGroup),
      );

      if (missingConfigs.length === 0) {
        this.logger.log(
          'All security config groups already exist, skipping seed',
        );
        return;
      }

      const entities = missingConfigs.map((seed) =>
        this.securityConfigRepo.create({
          configGroup: seed.configGroup,
          configData: seed.configData as Record<string, any>,
          description: seed.description,
        }),
      );

      await this.securityConfigRepo.save(entities);

      this.logger.log(
        `Seeded ${missingConfigs.length} missing config group(s): ${missingConfigs.map((c) => c.configGroup).join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize security configuration: ${error.message}`,
        error.stack,
      );
      // 不抛出异常，允许应用继续启动
    }
  }

  /**
   * 重置配置到默认值
   */
  async resetConfig(): Promise<void> {
    try {
      this.logger.log('Resetting security configuration to default...');
      await this.securityConfigService.resetToDefault();
      await this.initializeConfig();
      this.logger.log('Security configuration reset successfully');
    } catch (error) {
      this.logger.error(
        `Failed to reset security configuration: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
