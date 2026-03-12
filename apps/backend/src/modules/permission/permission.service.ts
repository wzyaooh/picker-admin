import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { pathToRegexp } from 'path-to-regexp';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { RedisService } from '@/shared/redis.service';
import { SharedService } from '@/shared/shared.service';
import { PermissionType } from '@/types';

import { CreatePermissionDto, MenuTreeNodeDto, ModuleInfoDto, UpdatePermissionDto } from './dto';
import { Permission } from './entities';

/**
 * 权限服务
 * 提供权限的增删改查、树形结构、菜单管理等功能
 */
@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    private readonly sharedService: SharedService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 验证权限层级关系
   * @param type 权限类型
   * @param parentId 父权限ID
   * @throws CustomException 如果层级关系不合法
   */
  private async validateHierarchy(type: PermissionType, parentId?: number): Promise<void> {
    if (type === 'MODULE' && parentId) {
      throw new CustomException(ErrorCode.ERR_21001, 'MODULE 必须是顶层节点');
    }

    if (type === 'API') return;

    if (!parentId) {
      if (type !== 'MODULE') {
        throw new BadRequestException(`${type} must have a parent node`);
      }
      return;
    }

    const parent = await this.permissionRepo.findOne({ where: { id: parentId } });
    if (!parent) {
      throw new CustomException(ErrorCode.ERR_21006, '父权限不存在');
    }

    const validRelations: Record<PermissionType, PermissionType[]> = {
      MODULE: [],
      CATALOG: ['MODULE'],
      MENU: ['CATALOG'],
      BUTTON: ['MENU'],
      API: [],
    };

    const allowedParentTypes = validRelations[type];
    if (allowedParentTypes.length > 0 && !allowedParentTypes.includes(parent.type)) {
      const errorCodeMap: Record<PermissionType, (typeof ErrorCode)[keyof typeof ErrorCode]> = {
        MODULE: ErrorCode.ERR_21001,
        CATALOG: ErrorCode.ERR_21002,
        MENU: ErrorCode.ERR_21003,
        BUTTON: ErrorCode.ERR_21004,
        API: ErrorCode.ERR_21001,
      };

      throw new CustomException(
        errorCodeMap[type],
        `${type} can only be created under ${allowedParentTypes.join(' or ')}`,
      );
    }
  }

  /**
   * 检查循环引用
   * @param nodeId 节点ID
   * @param newParentId 新父节点ID
   * @throws CustomException 如果检测到循环引用
   */
  private async checkCircularReference(nodeId: number, newParentId: number): Promise<void> {
    let currentId = newParentId;
    const visited = new Set<number>();

    while (currentId) {
      if (currentId === nodeId) {
        throw new CustomException(ErrorCode.ERR_21005, '检测到循环引用');
      }

      if (visited.has(currentId)) break;
      visited.add(currentId);

      const parent = await this.permissionRepo.findOne({
        where: { id: currentId },
        select: ['parentId'],
      });

      if (!parent) break;
      currentId = parent.parentId;
    }
  }

  /**
   * 清除权限相关缓存
   */
  private async invalidateCache(): Promise<void> {
    try {
      await Promise.all([
        this.redisService.del('permission:all'),
        this.redisService.del('permission:tree'),
        this.redisService.del('permission:menu:tree'),
      ]);
    } catch (error) {
      this.logger.error(`Cache invalidation failed: ${error.message}`);
    }
  }

  /**
   * 清理权限缓存（公共方法）
   * @returns 清理结果
   */
  async clearCache(): Promise<{ success: boolean; message: string }> {
    try {
      await this.invalidateCache();
      this.logger.log('权限缓存已清理');
      return { success: true, message: '权限缓存清理成功' };
    } catch (error) {
      this.logger.error(`清理权限缓存失败: ${error.message}`);
      return { success: false, message: '权限缓存清理失败' };
    }
  }
  /**
   * 创建权限
   * @param createPermissionDto 权限创建数据
   * @returns 创建的权限实体
   */
  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    await this.validateHierarchy(createPermissionDto.type, createPermissionDto.parentId);

    const existing = await this.permissionRepo.findOne({
      where: { code: createPermissionDto.code },
    });

    if (existing) {
      throw new BadRequestException('Permission code already exists');
    }

    const permission = this.permissionRepo.create(createPermissionDto);
    const saved = await this.permissionRepo.save(permission);
    await this.invalidateCache();

    return saved;
  }

  /**
   * 批量创建权限
   * @param createPermissionDtos 权限创建数据数组
   * @returns 创建的权限实体数组
   */
  async batchCreate(createPermissionDtos: CreatePermissionDto[]): Promise<Permission[]> {
    const permissions = this.permissionRepo.create(createPermissionDtos);
    return this.permissionRepo.save(permissions);
  }

  /**
   * 查询所有权限
   * @returns 权限列表
   */
  async findAll(): Promise<Permission[]> {
    return this.permissionRepo.find({
      order: { order: 'ASC' },
    });
  }

  /**
   * 查询权限树形结构
   * @returns 权限树
   */
  async findAllTree(): Promise<Permission[]> {
    try {
      const cached = await this.redisService.get('permission:tree');
      if (cached) return JSON.parse(cached);
    } catch (error) {
      this.logger.error(`Cache read failed: ${error.message}`);
    }

    const permissions = await this.permissionRepo.find({ order: { order: 'ASC' } });
    const tree = this.sharedService.handleTree(permissions);

    try {
      await this.redisService.set('permission:tree', JSON.stringify(tree), 600);
    } catch (error) {
      this.logger.error(`Cache write failed: ${error.message}`);
    }

    return tree;
  }

  /**
   * 查询菜单树形结构（仅包含 MODULE、CATALOG、MENU）
   * @returns 菜单树
   */
  async findMenuTree(): Promise<Permission[]> {
    try {
      const cached = await this.redisService.get('permission:menu:tree');
      if (cached) return JSON.parse(cached);
    } catch (error) {
      this.logger.error(`Cache read failed: ${error.message}`);
    }

    const permissions = await this.permissionRepo.find({
      where: { type: In(['MODULE', 'CATALOG', 'MENU']) },
      order: { order: 'ASC' },
    });

    const tree = this.sharedService.handleTree(permissions);

    try {
      await this.redisService.set('permission:menu:tree', JSON.stringify(tree), 600);
    } catch (error) {
      this.logger.error(`Cache write failed: ${error.message}`);
    }

    return tree;
  }

  /**
   * 查询单个权限
   * @param id 权限ID
   * @returns 权限实体
   */
  async findOne(id: number): Promise<Permission | null> {
    return this.permissionRepo.findOne({ where: { id } });
  }

  /**
   * 更新权限
   * @param id 权限ID
   * @param updatePermissionDto 更新数据
   * @returns 更新成功返回 true
   */
  async update(id: number, updatePermissionDto: UpdatePermissionDto): Promise<boolean> {
    const permission = await this.permissionRepo.findOne({ where: { id } });
    if (!permission) {
      throw new CustomException(ErrorCode.ERR_20002, '权限不存在或者已删除');
    }

    if (updatePermissionDto.type || updatePermissionDto.parentId !== undefined) {
      const newType = updatePermissionDto.type || permission.type;
      const newParentId =
        updatePermissionDto.parentId !== undefined
          ? updatePermissionDto.parentId
          : permission.parentId;

      await this.validateHierarchy(newType, newParentId);

      if (newParentId && newParentId !== permission.parentId) {
        await this.checkCircularReference(id, newParentId);
      }
    }

    if (updatePermissionDto.code && updatePermissionDto.code !== permission.code) {
      const existing = await this.permissionRepo.findOne({
        where: { code: updatePermissionDto.code },
      });

      if (existing) {
        throw new BadRequestException('Permission code already exists');
      }
    }

    const newPermission = this.permissionRepo.merge(permission, updatePermissionDto);
    await this.permissionRepo.save(newPermission);
    await this.invalidateCache();

    return true;
  }

  /**
   * 递归查找所有子权限
   * @param parentId 父权限ID
   * @returns 所有子权限列表（包括子孙权限）
   */
  private async findAllDescendants(parentId: number): Promise<Permission[]> {
    const children = await this.permissionRepo.find({ where: { parentId } });
    if (children.length === 0) return [];

    const descendants: Permission[] = [...children];
    for (const child of children) {
      const childDescendants = await this.findAllDescendants(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  /**
   * 删除权限（级联删除所有子权限）
   * @param id 权限ID
   * @returns 删除成功返回 true
   */
  async remove(id: number): Promise<boolean> {
    const permission = await this.permissionRepo.findOne({
      where: { id },
      relations: { roles: true },
    });

    if (!permission) {
      throw new CustomException(ErrorCode.ERR_20002, '权限不存在或者已删除');
    }

    if (permission.roles?.length) {
      throw new CustomException(ErrorCode.ERR_20003, '当前权限存在已授权的角色，不允许删除！');
    }

    const descendants = await this.findAllDescendants(id);
    const idsToDelete = [id, ...descendants.map((d) => d.id)];

    await this.permissionRepo.delete(idsToDelete);
    await this.invalidateCache();

    return true;
  }

  /**
   * 查询按钮权限
   * @param parentId 父权限ID
   * @returns 按钮权限列表
   */
  async findButton(parentId: number): Promise<Permission[]> {
    return this.permissionRepo.find({
      where: { parentId, type: In(['BUTTON']) },
    });
  }

  /**
   * 验证菜单路径是否存在
   * @param path 菜单路径
   * @returns 路径存在返回 true
   */
  async validateMenuPath(path: string): Promise<boolean> {
    const allMenu = await this.permissionRepo.find({
      where: { type: 'MENU' },
    });
    return allMenu.some((menu) => menu.path && pathToRegexp(menu.path).test(path));
  }

  /**
   * 获取用户的所有权限
   * @param userId 用户ID
   * @returns 用户权限列表
   */
  private async getUserPermissions(userId: number): Promise<Permission[]> {
    return this.permissionRepo.manager
      .createQueryBuilder()
      .select('permission')
      .from(Permission, 'permission')
      .innerJoin('permission.roles', 'role')
      .innerJoin('role.users', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  }

  /**
   * 根据用户权限过滤菜单
   * @param menus 所有菜单
   * @param userPermissions 用户权限
   * @returns 过滤后的菜单列表
   */
  private filterByPermissions(menus: Permission[], userPermissions: Permission[]): Permission[] {
    const permissionIds = new Set(userPermissions.map((p) => p.id));

    return menus.filter((menu) => {
      if (menu.type === 'MODULE' || menu.type === 'CATALOG') {
        return this.hasChildPermission(menu, permissionIds, menus);
      }
      return permissionIds.has(menu.id);
    });
  }

  /**
   * 检查父节点是否有子权限
   * @param parent 父节点
   * @param permissionIds 权限ID集合
   * @param allMenus 所有菜单
   * @returns 有子权限返回 true
   */
  private hasChildPermission(
    parent: Permission,
    permissionIds: Set<number>,
    allMenus: Permission[],
  ): boolean {
    const children = allMenus.filter((m) => m.parentId === parent.id);
    if (children.length === 0) return false;

    return children.some((child) => {
      if (child.type === 'MENU') {
        return permissionIds.has(child.id);
      }
      return this.hasChildPermission(child, permissionIds, allMenus);
    });
  }

  /**
   * 构建菜单树形结构
   * @param menus 菜单列表
   * @returns 菜单树
   */
  private buildTree(menus: Permission[]): MenuTreeNodeDto[] {
    const map = new Map<number, MenuTreeNodeDto>();
    const roots: MenuTreeNodeDto[] = [];

    menus.forEach((menu) => {
      map.set(menu.id, {
        id: menu.id,
        name: menu.name,
        code: menu.code,
        type: menu.type,
        path: menu.path,
        icon: menu.icon,
        sort: menu.order,
        parentId: menu.parentId,
        component: menu.component,
        layout: menu.layout,
        redirect: menu.redirect,
        keepAlive: menu.keepAlive,
        show: menu.show,
        children: [],
      });
    });

    menus.forEach((menu) => {
      const node = map.get(menu.id);
      if (!node) return;
      
      if (menu.parentId === null || menu.parentId === undefined) {
        roots.push(node);
      } else {
        const parent = map.get(menu.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    const sortTree = (nodes: MenuTreeNodeDto[]) => {
      nodes.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          sortTree(node.children);
        }
      });
    };

    sortTree(roots);
    return roots;
  }

  /**
   * 获取用户菜单树
   * @param userId 用户ID
   * @param moduleCode 模块代码（可选）
   * @returns 菜单树
   */
  async getMenuTree(userId: number, moduleCode?: string): Promise<MenuTreeNodeDto[]> {
    const userPermissions = await this.getUserPermissions(userId);

    const queryBuilder = this.permissionRepo
      .createQueryBuilder('permission')
      .where('permission.enable = :enable', { enable: true })
      .andWhere('permission.type IN (:...types)', {
        types: ['MODULE', 'CATALOG', 'MENU'],
      })
      .orderBy('permission.order', 'ASC');

    let module: Permission | null = null;

    if (moduleCode) {
      module = await this.permissionRepo.findOne({
        where: { code: moduleCode, type: 'MODULE' },
      });

      if (module) {
        const descendants = await this.findAllDescendants(module.id);
        const descendantIds = descendants.map(d => d.id);
        
        if (descendantIds.length > 0) {
          queryBuilder.andWhere('permission.id IN (:...ids)', { ids: descendantIds });
          queryBuilder.andWhere('permission.type IN (:...types)', { types: ['CATALOG', 'MENU'] });
        } else {
          return [];
        }
      } else {
        return [];
      }
    }

    const allMenus = await queryBuilder.getMany();

    if (moduleCode && module) {
      allMenus.forEach(menu => {
        if (menu.parentId === module.id) {
          (menu as any).parentId = null;
        }
      });
    }

    const filteredMenus = this.filterByPermissions(allMenus, userPermissions);
    return this.buildTree(filteredMenus);
  }

  /**
   * 获取用户可访问的模块列表
   * @param userId 用户ID
   * @returns 模块信息列表
   */
  async getModules(userId: number): Promise<ModuleInfoDto[]> {
    const userPermissions = await this.getUserPermissions(userId);
    const permissionIds = new Set(userPermissions.map((p) => p.id));

    const modules = await this.permissionRepo.find({
      where: { type: 'MODULE', enable: true, show: true },
      order: { order: 'ASC' },
    });

    const allMenus = await this.permissionRepo.find({
      where: { type: In(['MODULE', 'CATALOG', 'MENU']), enable: true },
    });

    return modules
      .filter((module) => this.hasChildPermission(module, permissionIds, allMenus))
      .map((module) => ({
        id: module.id,
        name: module.name,
        code: module.code,
        icon: module.icon,
        sort: module.order,
      }));
  }

  /**
   * 验证菜单路径唯一性
   * @param path 菜单路径
   * @param excludeId 排除的权限ID（用于更新时）
   * @returns 路径唯一返回 true
   */
  async validateMenuPathUnique(path: string, excludeId?: number): Promise<boolean> {
    const queryBuilder = this.permissionRepo
      .createQueryBuilder('permission')
      .where('permission.path = :path', { path })
      .andWhere('permission.type = :type', { type: 'MENU' });

    if (excludeId) {
      queryBuilder.andWhere('permission.id != :id', { id: excludeId });
    }

    const count = await queryBuilder.getCount();
    return count === 0;
  }
}
