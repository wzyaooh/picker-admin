import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { ClientMenu, MenuType } from './entities';
import { ClientModule } from '../module/entities/client-module.entity';
import { CreateMenuDto, UpdateMenuDto, QueryMenuDto } from './dto';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    @InjectRepository(ClientMenu)
    private readonly menuRepo: Repository<ClientMenu>,
    @InjectRepository(ClientModule)
    private readonly moduleRepo: Repository<ClientModule>,
  ) {}

  /**
   * 验证权限标识唯一性
   */
  private async validateCodeUnique(code: string, excludeId?: number): Promise<void> {
    const query: any = { code };
    const existing = await this.menuRepo.findOne({ where: query });

    if (existing && existing.id !== excludeId) {
      throw new CustomException(ErrorCode.ERR_20001, '权限标识已存在');
    }
  }

  /**
   * 验证父子类型约束
   */
  private async validateParentType(parentId: number, childType: MenuType): Promise<void> {
    // 定义有效的父子关系
    const validRelations: Record<MenuType, MenuType[]> = {
      MODULE: [],
      CATALOG: ['MODULE'],
      MENU: ['CATALOG'],
      BUTTON: ['MENU'],
    };

    const allowedParentTypes = validRelations[childType];
    
    // 如果子类型是 CATALOG，父级应该是 MODULE，需要在 client_module 表中查找
    if (childType === 'CATALOG' && allowedParentTypes.includes('MODULE')) {
      const module = await this.moduleRepo.findOne({ where: { id: parentId } });
      
      if (!module) {
        throw new CustomException(ErrorCode.ERR_20002, '父级模块不存在');
      }
      
      // 模块验证通过
      return;
    }

    // 其他情况，在 client_menu 表中查找父级
    const parent = await this.menuRepo.findOne({ where: { id: parentId } });

    if (!parent) {
      throw new CustomException(ErrorCode.ERR_20002, '父级菜单不存在');
    }

    if (allowedParentTypes.length > 0 && !allowedParentTypes.includes(parent.type)) {
      throw new CustomException(
        ErrorCode.ERR_20001,
        `${childType} 只能创建在 ${allowedParentTypes.join(' 或 ')} 下`
      );
    }
  }

  /**
   * 验证路由地址格式
   */
  private validateRoutePath(path: string): void {
    const pathRegex = /^\/[a-z0-9-/]*$/;
    if (!pathRegex.test(path)) {
      throw new CustomException(
        ErrorCode.ERR_10001,
        '路由地址格式不正确，必须以 / 开头，只能包含小写字母、数字、连字符和斜杠'
      );
    }
  }

  /**
   * 验证必填字段
   */
  private validateRequiredFields(dto: CreateMenuDto | UpdateMenuDto): void {
    const type = dto.type;

    if (type === 'CATALOG' || type === 'MENU') {
      if (!dto.path) {
        throw new CustomException(ErrorCode.ERR_10001, `${type} 类型必须提供路由地址`);
      }
      this.validateRoutePath(dto.path);
    }

    if (type === 'MENU' && !dto.component) {
      throw new CustomException(ErrorCode.ERR_10001, 'MENU 类型必须提供组件路径');
    }
  }

  /**
   * 检查是否有子菜单
   */
  private async hasChildren(id: number): Promise<boolean> {
    const count = await this.menuRepo.count({ where: { parentId: id } });
    return count > 0;
  }

  /**
   * 构建树形结构
   */
  private buildTree(menus: ClientMenu[], parentId: number | null = null): ClientMenu[] {
    const result: ClientMenu[] = [];

    for (const menu of menus) {
      if (menu.parentId === parentId) {
        const children = this.buildTree(menus, menu.id);
        if (children.length > 0) {
          (menu as any).children = children;
        }
        result.push(menu);
      }
    }

    // 按 order 排序
    return result.sort((a, b) => a.order - b.order);
  }

  /**
   * 创建菜单
   */
  async create(dto: CreateMenuDto): Promise<ClientMenu> {
    this.logger.log(`Creating menu: ${dto.name}`);

    // 验证权限标识唯一性
    await this.validateCodeUnique(dto.code);

    // 验证必填字段
    this.validateRequiredFields(dto);

    // 验证父子类型约束
    if (dto.parentId) {
      await this.validateParentType(dto.parentId, dto.type);
    }

    // 创建菜单
    const menu = this.menuRepo.create({
      ...dto,
      hidden: dto.hidden ?? false,
      enable: dto.enable ?? true,
      order: dto.order ?? 999,
    });

    const result = await this.menuRepo.save(menu);
    this.logger.log(`Menu created successfully: ${result.id}`);

    return result;
  }

  /**
   * 批量创建菜单
   */
  async batchCreate(dtos: CreateMenuDto[]): Promise<ClientMenu[]> {
    this.logger.log(`Batch creating ${dtos.length} menus`);

    const results: ClientMenu[] = [];

    for (const dto of dtos) {
      const menu = await this.create(dto);
      results.push(menu);
    }

    this.logger.log(`Batch created ${results.length} menus successfully`);
    return results;
  }

  /**
   * 查询菜单树
   */
  async findTree(query: QueryMenuDto = {}): Promise<ClientMenu[]> {
    const { moduleCode, keyword } = query;

    const queryBuilder = this.menuRepo.createQueryBuilder('menu');

    // 模块过滤
    if (moduleCode) {
      queryBuilder.where('menu.moduleCode = :moduleCode', { moduleCode });
    }

    // 搜索过滤
    if (keyword) {
      queryBuilder.andWhere('menu.name LIKE :keyword', { keyword: `%${keyword}%` });
    }

    const menus = await queryBuilder.orderBy('menu.order', 'ASC').getMany();

    // 如果指定了模块，需要找到模块ID作为根节点
    let rootParentId: number | null = null;
    if (moduleCode && menus.length > 0) {
      // 查找模块ID（从第一个菜单的 parentId 向上追溯）
      const firstMenu = menus[0];
      if (firstMenu.parentId) {
        // 检查 parentId 是否在当前菜单列表中
        const parentInMenus = menus.find(m => m.id === firstMenu.parentId);
        if (!parentInMenus) {
          // parentId 不在菜单列表中，说明它是模块ID
          rootParentId = firstMenu.parentId;
        }
      }
    }

    // 构建树形结构
    return this.buildTree(menus, rootParentId);
  }

  /**
   * 查询单个菜单
   */
  async findOne(id: number): Promise<ClientMenu> {
    const menu = await this.menuRepo.findOne({ where: { id } });

    if (!menu) {
      throw new CustomException(ErrorCode.ERR_20002, '菜单不存在');
    }

    return menu;
  }

  /**
   * 更新菜单
   */
  async update(id: number, dto: UpdateMenuDto): Promise<ClientMenu> {
    this.logger.log(`Updating menu: ${id}`);

    // 检查菜单是否存在
    const menu = await this.findOne(id);

    // 如果更新权限标识，验证唯一性
    if (dto.code && dto.code !== menu.code) {
      await this.validateCodeUnique(dto.code, id);
    }

    // 验证必填字段
    if (dto.type) {
      this.validateRequiredFields({ ...menu, ...dto } as any);
    }

    // 验证父子类型约束
    if (dto.parentId && dto.type) {
      await this.validateParentType(dto.parentId, dto.type);
    }

    // 更新菜单
    await this.menuRepo.update(id, dto);

    const updated = await this.findOne(id);
    this.logger.log(`Menu updated successfully: ${id}`);

    return updated;
  }

  /**
   * 删除菜单
   */
  async remove(id: number): Promise<boolean> {
    this.logger.log(`Deleting menu: ${id}`);

    // 检查菜单是否存在
    await this.findOne(id);

    // 检查是否有子菜单
    const hasChildMenus = await this.hasChildren(id);
    if (hasChildMenus) {
      throw new CustomException(
        ErrorCode.ERR_20003,
        '菜单包含子项，无法删除'
      );
    }

    // 删除菜单
    await this.menuRepo.delete(id);
    this.logger.log(`Menu deleted successfully: ${id}`);

    return true;
  }

  /**
   * 查询指定菜单的按钮权限
   */
  async findButtons(menuId: number): Promise<ClientMenu[]> {
    // 检查菜单是否存在
    await this.findOne(menuId);

    // 查询按钮权限
    const buttons = await this.menuRepo.find({
      where: {
        parentId: menuId,
        type: 'BUTTON',
      },
      order: {
        order: 'ASC',
      },
    });

    return buttons;
  }
}
