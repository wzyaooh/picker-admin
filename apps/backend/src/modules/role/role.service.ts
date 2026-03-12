import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { ROLE_CONSTANTS } from '@/constants';
import { Permission } from '@/modules/permission/entities';
import { User } from '@/modules/user/entities';
import { SharedService } from '@/shared/shared.service';

import {
  AddRolePermissionsDto,
  AddRoleUsersDto,
  CreateRoleDto,
  GetRolesDto,
  QueryRoleDto,
  QueryRoleUsersDto,
  UpdateRoleDto,
} from './dto';
import { Role } from './entities';

/**
 * 角色服务
 * 提供角色的增删改查、权限分配、用户分配等功能
 */
@Injectable()
export class RoleService {
  constructor(
    private readonly sharedService: SharedService,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}
  /**
   * 创建角色
   * @param createRoleDto 角色创建数据
   * @returns 创建的角色实体
   */
  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existRole = await this.roleRepo.findOne({
      where: [{ name: createRoleDto.name }, { code: createRoleDto.code }],
    });
    
    if (existRole) {
      throw new CustomException(ErrorCode.ERR_20001, '角色已存在（角色名和角色编码不能重复）');
    }
    
    const role = this.roleRepo.create(createRoleDto);
    
    if (createRoleDto.permissionIds) {
      role.permissions = await this.permissionRepo.find({
        where: { id: In(createRoleDto.permissionIds) },
      });
    }
    
    return this.roleRepo.save(role);
  }

  /**
   * 查询所有角色
   * @param query 查询条件
   * @returns 角色列表
   */
  async findAll(query: GetRolesDto): Promise<Role[]> {
    return this.roleRepo.find({ where: query });
  }

  /**
   * 分页查询角色列表
   * @param query 查询参数
   * @returns 分页数据
   */
  async findPagination(query: QueryRoleDto) {
    const pageSize = query.pageSize || 10;
    const pageNo = query.pageNo || 1;

    const queryBuilder = this.roleRepo
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('role.name LIKE :name', { name: `%${query.name || ''}%` });

    if (query.enable !== undefined) {
      queryBuilder.andWhere('role.enable = :enable', { enable: query.enable });
    }

    const [data, total] = await queryBuilder
      .orderBy('role.name', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const pageData = data.map((item) => {
      const permissionIds = item.permissions.map((p: any) => p.id);
      const { permissions, ...rest } = item;
      return { ...rest, permissionIds };
    });
    
    return { pageData, total };
  }

  /**
   * 查询单个角色
   * @param id 角色ID
   * @param includeRelations 是否包含关联数据
   * @returns 角色实体
   */
  findOne(id: number, includeRelations = false): Promise<Role | null> {
    if (includeRelations) {
      return this.roleRepo.findOne({
        where: { id },
        relations: { users: true, permissions: true },
      });
    }
    return this.roleRepo.findOne({ where: { id } });
  }

  /**
   * 查询角色权限树
   * @param code 角色编码
   * @returns 权限树结构
   */
  async findRolePermissionsTree(code: string): Promise<Permission[]> {
    const role = await this.roleRepo.findOne({ where: { code } });
    
    if (!role) {
      throw new CustomException(ErrorCode.ERR_20002, '当前角色不存在或者已删除');
    }
    
    const permissions = await this.permissionRepo.find({
      where: role.code === ROLE_CONSTANTS.SUPER_ADMIN ? undefined : { roles: [role] },
    });
    
    return this.sharedService.handleTree(permissions);
  }

  /**
   * 查询角色权限列表
   * @param id 角色ID
   * @returns 权限列表
   */
  async findRolePermissions(id: number): Promise<Permission[]> {
    const role = await this.findOne(id);
    
    if (!role) {
      throw new CustomException(ErrorCode.ERR_20002, '当前角色不存在或者已删除');
    }
    
    return this.permissionRepo.find({ where: { roles: [role] } });
  }

  /**
   * 更新角色
   * @param id 角色ID
   * @param updateRoleDto 更新数据
   * @returns 更新成功返回 true
   */
  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<boolean> {
    const role = await this.findOne(id);
    
    if (!role) {
      throw new CustomException(ErrorCode.ERR_20002, '角色不存在或者已删除');
    }
    
    if (role.code === ROLE_CONSTANTS.SUPER_ADMIN) {
      throw new CustomException(ErrorCode.ERR_11006, '不允许修改超级管理员');
    }
    
    const newRole = this.roleRepo.merge(role, updateRoleDto);
    
    if (updateRoleDto.permissionIds) {
      newRole.permissions = await this.permissionRepo.find({
        where: { id: In(updateRoleDto.permissionIds) },
      });
    }
    
    await this.roleRepo.save(newRole);
    return true;
  }

  /**
   * 删除角色
   * @param id 角色ID
   * @returns 删除成功返回 true
   */
  async remove(id: number): Promise<boolean> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: { users: true },
    });
    
    if (!role) {
      throw new CustomException(ErrorCode.ERR_20002, '角色不存在或者已删除');
    }
    
    if (role.code === ROLE_CONSTANTS.SUPER_ADMIN) {
      throw new CustomException(ErrorCode.ERR_11006, '不允许删除超级管理员');
    }
    
    if (role.users?.length) {
      throw new CustomException(ErrorCode.ERR_20003, '当前角色存在已授权的用户，不允许删除！');
    }
    
    await this.roleRepo.remove(role);
    return true;
  }

  /**
   * 分配角色权限
   * @param dto 权限分配数据
   * @returns 分配成功返回 true
   */
  async addRolePermissions(dto: AddRolePermissionsDto): Promise<boolean> {
    const { permissionIds, id } = dto;
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: { permissions: true },
    });
    
    if (!role) {
      throw new CustomException(ErrorCode.ERR_20002, '角色不存在或者已删除');
    }
    
    if (!permissionIds || permissionIds.length === 0) {
      role.permissions = [];
    } else {
      const permissions = await this.permissionRepo.find({
        where: permissionIds.map((item) => ({ id: item })),
      });
      role.permissions = permissions;
    }
    
    await this.roleRepo.save(role);
    return true;
  }

  /**
   * 分配角色用户
   * @param id 角色ID
   * @param dto 用户分配数据
   * @returns 分配成功返回 true
   */
  async addRoleUsers(id: number, dto: AddRoleUsersDto): Promise<boolean> {
    const { userIds } = dto;
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: { users: true },
    });
    
    if (!role) {
      throw new CustomException(ErrorCode.ERR_20002, '角色不存在或者已删除');
    }
    
    const users = await this.userRepo.find({ where: { id: In(userIds) } });
    role.users = role.users.filter((item) => !userIds.includes(item.id)).concat(users);
    await this.roleRepo.save(role);
    return true;
  }

  /**
   * 取消角色用户
   * @param id 角色ID
   * @param dto 用户取消数据
   * @returns 取消成功返回 true
   */
  async removeRoleUsers(id: number, dto: AddRoleUsersDto): Promise<boolean> {
    const { userIds } = dto;
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: { users: true },
    });
    
    if (!role) {
      throw new CustomException(ErrorCode.ERR_20002, '角色不存在或者已删除');
    }
    
    role.users = role.users.filter((item) => !userIds.includes(item.id));
    await this.roleRepo.save(role);
    return true;
  }

  /**
   * 查询角色用户列表（分页）
   * @param roleId 角色ID
   * @param query 查询参数
   * @returns 分页数据
   */
  async findRoleUsers(roleId: number, query: QueryRoleUsersDto) {
    const { pageNo = 1, pageSize = 10, username, realName } = query;

    const role = await this.roleRepo.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new CustomException(ErrorCode.ERR_20002, '角色不存在或者已删除');
    }

    const queryBuilder = this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role', 'role.id = :roleId', { roleId });

    if (username) {
      queryBuilder.andWhere('user.username LIKE :username', {
        username: `%${username}%`,
      });
    }

    if (realName) {
      queryBuilder.andWhere('user.realName LIKE :realName', {
        realName: `%${realName}%`,
      });
    }

    const [data, total] = await queryBuilder
      .orderBy('user.id', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      pageData: data,
      total,
    };
  }
}
