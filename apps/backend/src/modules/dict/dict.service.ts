import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { RedisService } from '@/shared/redis.service';

import { CreateDictDto, CreateDictItemDto, QueryDictDto, UpdateDictDto, UpdateDictItemDto } from './dto';
import { Dict, DictItem } from './entities';

/**
 * 字典服务
 * 提供字典和字典项的增删改查功能，支持缓存
 */
@Injectable()
export class DictService {
  private readonly logger = new Logger(DictService.name);
  private readonly CACHE_TTL = 600; // 10 minutes

  constructor(
    @InjectRepository(Dict)
    private readonly dictRepo: Repository<Dict>,
    @InjectRepository(DictItem)
    private readonly dictItemRepo: Repository<DictItem>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 创建字典
   * @param dto 创建字典DTO
   * @returns 创建的字典
   */
  async create(dto: CreateDictDto): Promise<Dict> {
    this.logger.log(`Creating dict with code: ${dto.code}`);

    // 检查 code 是否已存在
    const existing = await this.dictRepo.findOne({
      where: { code: dto.code },
    });

    if (existing) {
      this.logger.warn(`Dict code already exists: ${dto.code}`);
      throw new CustomException(ErrorCode.ERR_20001, '字典编码已存在');
    }

    try {
      // 创建字典实体
      const dict = this.dictRepo.create({
        ...dto,
        enable: dto.enable !== undefined ? (dto.enable ? 1 : 0) : 1,
      });

      // 保存到数据库
      const savedDict = await this.dictRepo.save(dict);
      this.logger.log(`Dict created successfully with id: ${savedDict.id}`);

      // 清除相关缓存
      await this.invalidateDictCache(savedDict.code);

      return savedDict;
    } catch (error) {
      this.logger.error(`Failed to create dict: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 分页查询字典列表
   * @param query 查询参数
   * @returns 分页结果
   */
  async findAll(query: QueryDictDto): Promise<{ pageData: Dict[]; total: number }> {
    const { pageNo = 1, pageSize = 10, keyword, enable } = query;

    this.logger.log(`Querying dicts with params: ${JSON.stringify(query)}`);

    try {
      const queryBuilder = this.dictRepo.createQueryBuilder('dict');

      // 关键字搜索（匹配 name 或 code）
      if (keyword) {
        queryBuilder.andWhere('(dict.name LIKE :keyword OR dict.code LIKE :keyword)', {
          keyword: `%${keyword}%`,
        });
      }

      // 启用状态过滤
      if (enable !== undefined) {
        queryBuilder.andWhere('dict.enable = :enable', {
          enable: enable ? 1 : 0,
        });
      }

      // 分页和排序
      const [data, total] = await queryBuilder
        .orderBy('dict.id', 'DESC')
        .skip((pageNo - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();

      this.logger.log(`Found ${total} dicts, returning page ${pageNo}`);

      return { pageData: data, total };
    } catch (error) {
      this.logger.error(`Failed to query dicts: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 查询所有字典（不分页）
   * @returns 所有字典列表
   */
  async findAllWithoutPagination(): Promise<Dict[]> {
    this.logger.log('Querying all dicts without pagination');

    try {
      const dicts = await this.dictRepo.find({
        order: { id: 'DESC' },
      });

      this.logger.log(`Found ${dicts.length} dicts`);
      return dicts;
    } catch (error) {
      this.logger.error(`Failed to query all dicts: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据 ID 查询字典
   * @param id 字典ID
   * @returns 字典详情
   */
  async findOne(id: number): Promise<Dict> {
    this.logger.log(`Finding dict by id: ${id}`);

    try {
      const dict = await this.dictRepo.findOne({
        where: { id },
      });

      if (!dict) {
        this.logger.warn(`Dict not found with id: ${id}`);
        throw new CustomException(ErrorCode.ERR_20002, '字典不存在');
      }

      return dict;
    } catch (error) {
      if (error instanceof CustomException) {
        throw error;
      }
      this.logger.error(`Failed to find dict: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据 code 查询字典
   * @param code 字典编码
   * @returns 字典详情
   */
  async findByCode(code: string): Promise<Dict> {
    this.logger.log(`Finding dict by code: ${code}`);

    try {
      const dict = await this.dictRepo.findOne({
        where: { code },
      });

      if (!dict) {
        this.logger.warn(`Dict not found with code: ${code}`);
        throw new CustomException(ErrorCode.ERR_20002, '字典不存在');
      }

      return dict;
    } catch (error) {
      if (error instanceof CustomException) {
        throw error;
      }
      this.logger.error(`Failed to find dict by code: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新字典
   * @param id 字典ID
   * @param dto 更新数据
   * @returns 更新后的字典
   */
  async update(id: number, dto: UpdateDictDto): Promise<Dict> {
    this.logger.log(`Updating dict with id: ${id}`);

    try {
      // 查找字典
      const dict = await this.findOne(id);
      const oldCode = dict.code;

      // 如果更新 code，检查是否与其他字典重复
      if (dto.code && dto.code !== dict.code) {
        const existing = await this.dictRepo.findOne({
          where: { code: dto.code },
        });

        if (existing) {
          this.logger.warn(`Dict code already exists: ${dto.code}`);
          throw new CustomException(ErrorCode.ERR_20001, '字典编码已存在');
        }
      }

      // 合并更新数据
      const updatedDict = this.dictRepo.merge(dict, {
        ...dto,
        enable: dto.enable !== undefined ? (dto.enable ? 1 : 0) : dict.enable,
      });

      // 保存更新
      const savedDict = await this.dictRepo.save(updatedDict);
      this.logger.log(`Dict updated successfully with id: ${id}`);

      // 清除相关缓存（包括旧 code 和新 code）
      await this.invalidateDictCache(oldCode);
      if (dto.code && dto.code !== oldCode) {
        await this.invalidateDictCache(dto.code);
      }

      return savedDict;
    } catch (error) {
      if (error instanceof CustomException) {
        throw error;
      }
      this.logger.error(`Failed to update dict: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除字典（级联删除字典项）
   * @param id 字典ID
   * @returns 是否删除成功
   */
  async remove(id: number): Promise<boolean> {
    this.logger.log(`Removing dict with id: ${id}`);

    try {
      // 查找字典
      const dict = await this.findOne(id);
      const code = dict.code;

      // 删除字典（会级联删除字典项，因为实体中配置了 onDelete: 'CASCADE'）
      await this.dictRepo.remove(dict);

      this.logger.log(`Dict removed successfully with id: ${id}`);

      // 清除相关缓存
      await this.invalidateDictCache(code);

      return true;
    } catch (error) {
      if (error instanceof CustomException) {
        throw error;
      }
      this.logger.error(`Failed to remove dict: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== 字典项管理方法 ====================

  /**
   * 创建字典项
   * @param dictId 字典ID
   * @param dto 创建字典项DTO
   * @returns 创建的字典项
   */
  async createItem(dictId: number, dto: CreateDictItemDto): Promise<DictItem> {
    this.logger.log(`Creating dict item for dict ${dictId} with value: ${dto.value}`);

    try {
      // 验证字典是否存在
      const dict = await this.findOne(dictId);

      // 检查同字典内 value 是否已存在
      const existing = await this.dictItemRepo.findOne({
        where: { dictId, value: dto.value },
      });

      if (existing) {
        this.logger.warn(`Dict item value already exists in dict ${dictId}: ${dto.value}`);
        throw new CustomException(ErrorCode.ERR_20001, '字典项值已存在');
      }

      // 创建字典项实体，设置默认 sort 值为 0
      const dictItem = this.dictItemRepo.create({
        dictId,
        ...dto,
        sort: dto.sort !== undefined ? dto.sort : 0,
        enable: dto.enable !== undefined ? (dto.enable ? 1 : 0) : 1,
      });

      // 保存到数据库
      const savedItem = await this.dictItemRepo.save(dictItem);
      this.logger.log(`Dict item created successfully with id: ${savedItem.id}`);

      // 清除相关缓存
      await this.invalidateDictCache(dict.code);

      return savedItem;
    } catch (error) {
      if (error instanceof CustomException) {
        throw error;
      }
      this.logger.error(`Failed to create dict item: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 查询字典的所有字典项（按 sort 排序）
   * @param dictId 字典ID
   * @returns 字典项列表
   */
  async findItems(dictId: number): Promise<DictItem[]> {
    this.logger.log(`Finding items for dict: ${dictId}`);

    try {
      // 验证字典是否存在
      await this.findOne(dictId);

      // 查询字典项，按 sort 升序排序
      const items = await this.dictItemRepo.find({
        where: { dictId },
        order: { sort: 'ASC', id: 'ASC' },
      });

      this.logger.log(`Found ${items.length} items for dict ${dictId}`);
      return items;
    } catch (error) {
      if (error instanceof CustomException) {
        throw error;
      }
      this.logger.error(`Failed to find dict items: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据字典 code 查询字典项
   * @param code 字典编码
   * @returns 字典项列表
   */
  async findItemsByCode(code: string): Promise<DictItem[]> {
    this.logger.log(`Finding items for dict code: ${code}`);

    const cacheKey = `dict:code:${code}:items`;

    try {
      // 尝试从缓存获取
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for dict code: ${code}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      // 缓存读取失败，记录错误但继续执行
      this.logger.error(`Cache read failed for ${cacheKey}: ${error.message}`);
    }

    try {
      // 根据 code 查找字典
      const dict = await this.findByCode(code);

      // 查询字典项，按 sort 升序排序
      const items = await this.dictItemRepo.find({
        where: { dictId: dict.id },
        order: { sort: 'ASC', id: 'ASC' },
      });

      this.logger.log(`Found ${items.length} items for dict code ${code}`);

      // 写入缓存
      try {
        await this.redisService.set(cacheKey, JSON.stringify(items), this.CACHE_TTL);
        this.logger.log(`Cache written for dict code: ${code}`);
      } catch (error) {
        // 缓存写入失败，记录错误但不影响返回结果
        this.logger.error(`Cache write failed for ${cacheKey}: ${error.message}`);
      }

      return items;
    } catch (error) {
      if (error instanceof CustomException) {
        throw error;
      }
      this.logger.error(`Failed to find dict items by code: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新字典项
   * @param dictId 字典ID
   * @param itemId 字典项ID
   * @param dto 更新数据
   * @returns 更新后的字典项
   */
  async updateItem(dictId: number, itemId: number, dto: UpdateDictItemDto): Promise<DictItem> {
    this.logger.log(`Updating dict item ${itemId} in dict ${dictId}`);

    try {
      // 验证字典是否存在
      const dict = await this.findOne(dictId);

      // 查找字典项
      const item = await this.dictItemRepo.findOne({
        where: { id: itemId, dictId },
      });

      if (!item) {
        this.logger.warn(`Dict item not found: ${itemId} in dict ${dictId}`);
        throw new CustomException(ErrorCode.ERR_20002, '字典项不存在');
      }

      // 如果更新 value，检查是否与同字典内其他项重复
      if (dto.value && dto.value !== item.value) {
        const existing = await this.dictItemRepo.findOne({
          where: { dictId, value: dto.value },
        });

        if (existing) {
          this.logger.warn(`Dict item value already exists in dict ${dictId}: ${dto.value}`);
          throw new CustomException(ErrorCode.ERR_20001, '字典项值已存在');
        }
      }

      // 合并更新数据
      const updatedItem = this.dictItemRepo.merge(item, {
        ...dto,
        enable: dto.enable !== undefined ? (dto.enable ? 1 : 0) : item.enable,
      });

      // 保存更新
      const savedItem = await this.dictItemRepo.save(updatedItem);
      this.logger.log(`Dict item updated successfully: ${itemId}`);

      // 清除相关缓存
      await this.invalidateDictCache(dict.code);

      return savedItem;
    } catch (error) {
      if (error instanceof CustomException) {
        throw error;
      }
      this.logger.error(`Failed to update dict item: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除字典项
   * @param dictId 字典ID
   * @param itemId 字典项ID
   * @returns 是否删除成功
   */
  async removeItem(dictId: number, itemId: number): Promise<boolean> {
    this.logger.log(`Removing dict item ${itemId} from dict ${dictId}`);

    try {
      // 验证字典是否存在
      const dict = await this.findOne(dictId);

      // 查找字典项
      const item = await this.dictItemRepo.findOne({
        where: { id: itemId, dictId },
      });

      if (!item) {
        this.logger.warn(`Dict item not found: ${itemId} in dict ${dictId}`);
        throw new CustomException(ErrorCode.ERR_20002, '字典项不存在');
      }

      // 删除字典项
      await this.dictItemRepo.remove(item);

      this.logger.log(`Dict item removed successfully: ${itemId}`);

      // 清除相关缓存
      await this.invalidateDictCache(dict.code);

      return true;
    } catch (error) {
      if (error instanceof CustomException) {
        throw error;
      }
      this.logger.error(`Failed to remove dict item: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 清除字典相关缓存
   * @param code 字典编码
   */
  private async invalidateDictCache(code: string): Promise<void> {
    const cacheKey = `dict:code:${code}:items`;
    
    try {
      await this.redisService.del(cacheKey);
      this.logger.log(`Cache invalidated for dict code: ${code}`);
    } catch (error) {
      // 缓存清除失败，记录错误但不影响业务逻辑
      this.logger.error(`Cache invalidation failed for ${cacheKey}: ${error.message}`);
    }
  }
}
