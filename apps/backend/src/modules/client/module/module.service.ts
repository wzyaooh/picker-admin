import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { ClientModule } from './entities';
import { CreateModuleDto, UpdateModuleDto, QueryModuleDto } from './dto';

@Injectable()
export class ModuleService {
  private readonly logger = new Logger(ModuleService.name);

  constructor(
    @InjectRepository(ClientModule)
    private readonly moduleRepo: Repository<ClientModule>,
  ) {}

  /**
   * 验证模块编码唯一性
   */
  private async validateCodeUnique(code: string, excludeId?: number): Promise<void> {
    const query: any = { code };
    const existing = await this.moduleRepo.findOne({ where: query });

    if (existing && existing.id !== excludeId) {
      throw new CustomException(ErrorCode.ERR_20001, '模块编码已存在');
    }
  }

  /**
   * 检查模块是否有子菜单
   */
  private async hasChildren(id: number): Promise<boolean> {
    const module = await this.moduleRepo.findOne({
      where: { id },
      relations: ['menus'],
    });

    return !!(module?.menus && module.menus.length > 0);
  }

  /**
   * 创建模块
   */
  async create(dto: CreateModuleDto): Promise<ClientModule> {
    this.logger.log(`Creating module: ${dto.name}`);

    // 验证编码唯一性
    await this.validateCodeUnique(dto.code);

    // 创建模块
    const module = this.moduleRepo.create({
      ...dto,
      enable: dto.enable ?? true,
    });

    const result = await this.moduleRepo.save(module);
    this.logger.log(`Module created successfully: ${result.id}`);

    return result;
  }

  /**
   * 查询所有模块（支持搜索和分页）
   */
  async findAll(query: QueryModuleDto = {}): Promise<{
    pageData: ClientModule[];
    total: number;
  }> {
    const { pageNo = 1, pageSize = 10, keyword } = query;

    const queryBuilder = this.moduleRepo.createQueryBuilder('module');

    // 搜索过滤
    if (keyword) {
      queryBuilder.where(
        'module.name LIKE :keyword OR module.code LIKE :keyword',
        { keyword: `%${keyword}%` }
      );
    }

    // 分页
    const [pageData, total] = await queryBuilder
      .orderBy('module.createdAt', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { pageData, total };
  }

  /**
   * 查询单个模块
   */
  async findOne(id: number): Promise<ClientModule> {
    const module = await this.moduleRepo.findOne({ where: { id } });

    if (!module) {
      throw new CustomException(ErrorCode.ERR_20002, '模块不存在');
    }

    return module;
  }

  /**
   * 更新模块
   */
  async update(id: number, dto: UpdateModuleDto): Promise<ClientModule> {
    this.logger.log(`Updating module: ${id}`);

    // 检查模块是否存在
    const module = await this.findOne(id);

    // 如果更新编码，验证唯一性
    if (dto.code && dto.code !== module.code) {
      await this.validateCodeUnique(dto.code, id);
    }

    // 更新模块
    await this.moduleRepo.update(id, dto);

    const updated = await this.findOne(id);
    this.logger.log(`Module updated successfully: ${id}`);

    return updated;
  }

  /**
   * 删除模块
   */
  async remove(id: number): Promise<boolean> {
    this.logger.log(`Deleting module: ${id}`);

    // 检查模块是否存在
    await this.findOne(id);

    // 检查是否有子菜单
    const hasChildMenus = await this.hasChildren(id);
    if (hasChildMenus) {
      throw new CustomException(
        ErrorCode.ERR_20003,
        '模块包含子菜单，无法删除'
      );
    }

    // 删除模块
    await this.moduleRepo.delete(id);
    this.logger.log(`Module deleted successfully: ${id}`);

    return true;
  }
}
