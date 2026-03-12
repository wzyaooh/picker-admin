import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageConfig } from '../entities/storage-config.entity';
import { ObjectStorageConfig as ObjectStorageConfigEntity } from '../entities/object-storage-config.entity';
import { StorageAdapter } from './storage.interface';
import { LocalStorageAdapter } from './local-storage.adapter';
import { ObjectStorageAdapter, ObjectStorageConfig } from './object-storage.adapter';
import { ConfigService } from '@nestjs/config';

/**
 * 存储服务
 * 管理存储配置和适配器选择
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly adapters: Map<number, StorageAdapter> = new Map();

  constructor(
    @InjectRepository(StorageConfig)
    private storageConfigRepo: Repository<StorageConfig>,
    @InjectRepository(ObjectStorageConfigEntity)
    private objectStorageConfigRepo: Repository<ObjectStorageConfigEntity>,
    private configService: ConfigService,
  ) {}

  /**
   * 获取默认存储适配器
   */
  async getDefaultAdapter(): Promise<StorageAdapter> {
    // 查询默认存储配置（必须是启用状态）
    const config = await this.storageConfigRepo.findOne({
      where: { isDefault: true, enabled: true },
    });

    if (!config) {
      // 如果没有启用的默认配置，记录警告并使用本地存储
      this.logger.warn('No enabled default storage config found, using fallback local storage');
      return this.getLocalAdapter();
    }

    // 使用 getAdapter 方法，这样会使用正确的 storagePath
    return this.getAdapter(config.id);
  }

  /**
   * 根据配置ID获取存储适配器
   */
  async getAdapter(configId: number): Promise<StorageAdapter> {
    // 检查缓存
    if (this.adapters.has(configId)) {
      const adapter = this.adapters.get(configId);
      if (!adapter) {
        throw new Error(`Storage adapter not found for config ID: ${configId}`);
      }
      return adapter;
    }

    // 查询存储配置
    const config = await this.storageConfigRepo.findOne({
      where: { id: configId },
    });

    if (!config) {
      throw new Error(`Storage config not found: ${configId}`);
    }

    let adapter: StorageAdapter;

    if (config.type === 'local') {
      // 传递存储配置的 storagePath
      this.logger.log(`Creating LocalStorageAdapter for config ${configId} with storagePath: ${config.storagePath}`);
      adapter = this.getLocalAdapter(config.storagePath);
    } else if (config.type === 'object') {
      // 查询对象存储配置
      const objectConfig = await this.objectStorageConfigRepo.findOne({
        where: { storageConfigId: configId },
      });

      if (!objectConfig) {
        throw new Error(`Object storage config not found for: ${configId}`);
      }

      adapter = this.createObjectAdapter(objectConfig);
    } else {
      throw new Error(`Unsupported storage type: ${config.type}`);
    }

    // 缓存适配器
    this.adapters.set(configId, adapter);
    
    return adapter;
  }

  /**
   * 获取本地存储适配器
   */
  private getLocalAdapter(uploadDir?: string): StorageAdapter {
    return new LocalStorageAdapter(this.configService, uploadDir);
  }

  /**
   * 创建对象存储适配器
   */
  private createObjectAdapter(config: ObjectStorageConfigEntity): StorageAdapter {
    const objectConfig: ObjectStorageConfig = {
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      bucket: config.bucket,
      region: config.region,
      useSSL: config.useSSL,
    };

    return new ObjectStorageAdapter(this.configService, objectConfig);
  }

  /**
   * 获取默认存储配置
   */
  async getDefaultConfig(): Promise<StorageConfig> {
    const config = await this.storageConfigRepo.findOne({
      where: { isDefault: true, enabled: true },
    });

    if (!config) {
      throw new Error('No enabled default storage config found');
    }

    return config;
  }

  /**
   * 根据ID获取存储配置
   */
  async getConfigById(configId: number): Promise<StorageConfig> {
    const config = await this.storageConfigRepo.findOne({
      where: { id: configId },
    });

    if (!config) {
      throw new Error(`Storage config not found: ${configId}`);
    }

    return config;
  }

  /**
   * 根据配置ID获取存储适配器（别名方法）
   */
  async getAdapterByConfigId(configId: number): Promise<StorageAdapter> {
    return this.getAdapter(configId);
  }

  /**
   * 清除适配器缓存
   */
  clearCache(configId?: number) {
    if (configId) {
      this.adapters.delete(configId);
      this.logger.log(`Cleared adapter cache for config: ${configId}`);
    } else {
      this.adapters.clear();
      this.logger.log('Cleared all adapter cache');
    }
  }
}
