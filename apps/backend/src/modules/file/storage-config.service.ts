import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { StorageConfig, ObjectStorageConfig } from './entities';
import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import {
  CreateStorageConfigDto,
  UpdateStorageConfigDto,
  QueryStorageConfigDto,
} from './dto';

@Injectable()
export class StorageConfigService {
  private readonly logger = new Logger(StorageConfigService.name);

  constructor(
    @InjectRepository(StorageConfig)
    private storageConfigRepo: Repository<StorageConfig>,
    @InjectRepository(ObjectStorageConfig)
    private objectStorageConfigRepo: Repository<ObjectStorageConfig>,
  ) {}

  /**
   * 创建存储配置
   */
  async create(dto: CreateStorageConfigDto) {
    // 如果设置为默认存储，先取消其他默认存储
    if (dto.isDefault) {
      await this.storageConfigRepo.update(
        { isDefault: true },
        { isDefault: false },
      );
    }

    // 创建存储配置
    const storageConfig = this.storageConfigRepo.create({
      name: dto.name,
      type: dto.type,
      description: dto.description,
      isDefault: dto.isDefault || false,
      enabled: dto.enabled !== undefined ? dto.enabled : true,
      code: dto.code,
      storagePath: dto.storagePath,
      accessPath: dto.accessPath,
      enableRecycleBin: dto.enableRecycleBin || false,
      recycleBinPath: dto.recycleBinPath,
      sort: dto.sort !== undefined ? dto.sort : 999,
    });

    const savedConfig = await this.storageConfigRepo.save(storageConfig);

    // 如果是对象存储，创建对象存储配置
    if (dto.type === 'object' && dto.endpoint && dto.accessKeyId && dto.bucket) {
      const objectConfig = this.objectStorageConfigRepo.create({
        storageConfigId: savedConfig.id,
        endpoint: dto.endpoint,
        accessKeyId: dto.accessKeyId,
        secretAccessKey: dto.secretAccessKey || '',
        bucket: dto.bucket,
        region: dto.region,
        useSSL: dto.useSSL !== undefined ? dto.useSSL : true,
      });

      await this.objectStorageConfigRepo.save(objectConfig);
    }

    return this.findOne(savedConfig.id);
  }

  /**
   * 查询存储配置列表
   */
  async findAll(query: QueryStorageConfigDto) {
    const { type, keyword, enabled, page = 1, pageSize = 20 } = query;

    const queryBuilder = this.storageConfigRepo
      .createQueryBuilder('config')
      .leftJoinAndSelect(
        'object_storage_config',
        'object',
        'object.storageConfigId = config.id',
      );

    // 按类型过滤
    if (type) {
      queryBuilder.andWhere('config.type = :type', { type });
    }

    // 按关键词搜索
    if (keyword) {
      queryBuilder.andWhere('config.name LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    // 按启用状态过滤
    if (enabled !== undefined) {
      queryBuilder.andWhere('config.enabled = :enabled', { enabled });
    }

    // 排序
    queryBuilder.orderBy('config.isDefault', 'DESC');
    queryBuilder.addOrderBy('config.createdAt', 'DESC');

    // 分页
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    // 手动组装对象存储配置
    const result = await Promise.all(
      items.map(async (item) => {
        if (item.type === 'object') {
          const objectConfig = await this.objectStorageConfigRepo.findOne({
            where: { storageConfigId: item.id },
          });
          return {
            ...item,
            objectConfig: objectConfig || null,
          };
        }
        return item;
      }),
    );

    return {
      items: result,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 查询单个存储配置
   */
  async findOne(id: number) {
    const config = await this.storageConfigRepo.findOne({
      where: { id },
    });

    if (!config) {
      throw new CustomException(ErrorCode.ERR_20002, '存储配置不存在');
    }

    // 如果是对象存储，查询对象存储配置
    if (config.type === 'object') {
      const objectConfig = await this.objectStorageConfigRepo.findOne({
        where: { storageConfigId: id },
      });

      return {
        ...config,
        objectConfig: objectConfig || null,
      };
    }

    return config;
  }

  /**
   * 更新存储配置
   */
  async update(id: number, dto: UpdateStorageConfigDto) {
    const config = await this.storageConfigRepo.findOne({
      where: { id },
    });

    if (!config) {
      throw new CustomException(ErrorCode.ERR_20002, '存储配置不存在');
    }

    // 如果设置为默认存储，先取消其他默认存储
    if (dto.isDefault && !config.isDefault) {
      await this.storageConfigRepo.update(
        { isDefault: true },
        { isDefault: false },
      );
    }

    // 更新基础配置
    if (dto.name !== undefined) config.name = dto.name;
    if (dto.description !== undefined) config.description = dto.description;
    if (dto.isDefault !== undefined) config.isDefault = dto.isDefault;
    if (dto.enabled !== undefined) config.enabled = dto.enabled;
    if (dto.code !== undefined) config.code = dto.code;
    if (dto.storagePath !== undefined) config.storagePath = dto.storagePath;
    if (dto.accessPath !== undefined) config.accessPath = dto.accessPath;
    if (dto.enableRecycleBin !== undefined) config.enableRecycleBin = dto.enableRecycleBin;
    if (dto.recycleBinPath !== undefined) config.recycleBinPath = dto.recycleBinPath;
    if (dto.sort !== undefined) config.sort = dto.sort;

    await this.storageConfigRepo.save(config);

    // 如果是对象存储，更新对象存储配置
    if (config.type === 'object') {
      let objectConfig = await this.objectStorageConfigRepo.findOne({
        where: { storageConfigId: id },
      });

      if (!objectConfig && dto.endpoint && dto.accessKeyId && dto.bucket) {
        // 创建对象存储配置
        objectConfig = this.objectStorageConfigRepo.create({
          storageConfigId: id,
          endpoint: dto.endpoint,
          accessKeyId: dto.accessKeyId,
          secretAccessKey: dto.secretAccessKey || '',
          bucket: dto.bucket,
          region: dto.region,
          useSSL: dto.useSSL !== undefined ? dto.useSSL : true,
        });
      } else if (objectConfig) {
        // 更新对象存储配置
        if (dto.endpoint !== undefined) objectConfig.endpoint = dto.endpoint;
        if (dto.accessKeyId !== undefined)
          objectConfig.accessKeyId = dto.accessKeyId;
        if (dto.secretAccessKey !== undefined)
          objectConfig.secretAccessKey = dto.secretAccessKey;
        if (dto.bucket !== undefined) objectConfig.bucket = dto.bucket;
        if (dto.region !== undefined) objectConfig.region = dto.region;
        if (dto.useSSL !== undefined) objectConfig.useSSL = dto.useSSL;
      }

      if (objectConfig) {
        await this.objectStorageConfigRepo.save(objectConfig);
      }
    }

    return this.findOne(id);
  }

  /**
   * 删除存储配置
   */
  async remove(id: number) {
    const config = await this.storageConfigRepo.findOne({
      where: { id },
    });

    if (!config) {
      throw new CustomException(ErrorCode.ERR_20002, '存储配置不存在');
    }

    // 不允许删除默认存储
    if (config.isDefault) {
      throw new CustomException(
        ErrorCode.ERR_20001,
        '不允许删除默认存储配置',
      );
    }

    // 如果是对象存储，先删除对象存储配置
    if (config.type === 'object') {
      await this.objectStorageConfigRepo.delete({ storageConfigId: id });
    }

    await this.storageConfigRepo.delete(id);

    return true;
  }

  /**
   * 切换启用状态
   */
  async toggleEnabled(id: number) {
    const config = await this.storageConfigRepo.findOne({
      where: { id },
    });

    if (!config) {
      throw new CustomException(ErrorCode.ERR_20002, '存储配置不存在');
    }

    // 如果是默认存储且要禁用，检查是否有其他启用的存储配置
    if (config.isDefault && config.enabled) {
      const otherEnabledConfigs = await this.storageConfigRepo.count({
        where: { enabled: true },
      });

      if (otherEnabledConfigs <= 1) {
        throw new CustomException(
          ErrorCode.ERR_20001,
          '不能禁用唯一的默认存储配置，请先启用或设置其他存储配置为默认'
        );
      }
    }

    config.enabled = !config.enabled;
    await this.storageConfigRepo.save(config);

    return this.findOne(id);
  }

  /**
   * 设置为默认存储
   */
  async setDefault(id: number) {
    const config = await this.storageConfigRepo.findOne({
      where: { id },
    });

    if (!config) {
      throw new CustomException(ErrorCode.ERR_20002, '存储配置不存在');
    }

    // 取消其他默认存储
    await this.storageConfigRepo.update({ isDefault: true }, { isDefault: false });

    // 设置为默认
    config.isDefault = true;
    await this.storageConfigRepo.save(config);

    return this.findOne(id);
  }

  /**
   * 获取默认存储配置
   */
  async getDefault() {
    const config = await this.storageConfigRepo.findOne({
      where: { isDefault: true, enabled: true },
    });

    if (!config) {
      throw new CustomException(ErrorCode.ERR_20002, '未配置默认存储');
    }

    return this.findOne(config.id);
  }
}
