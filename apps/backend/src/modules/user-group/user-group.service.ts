import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { Permission } from '@/modules/permission/entities';
import { User } from '@/modules/user/entities';

import {
  AddMembersDto,
  CreateUserGroupDto,
  GetUserGroupDto,
  SetPermissionsDto,
  UpdateUserGroupDto,
} from './dto';
import { UserGroup } from './entities';

/**
 * 用户组服务
 * 提供用户组的增删改查、成员管理、权限管理等功能
 */
@Injectable()
export class UserGroupService {
  private readonly logger = new Logger(UserGroupService.name);

  constructor(
    @InjectRepository(UserGroup)
    private readonly userGroupRepo: Repository<UserGroup>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  /**
   * 创建用户组
   * @param dto 用户组创建数据
   * @returns 创建的用户组实体
   */
  async create(dto: CreateUserGroupDto): Promise<UserGroup> {
    this.logger.log(`Creating user group: ${dto.name}`);

    const existingByCode = await this.userGroupRepo.findOne({
      where: { code: dto.code },
    });
    
    if (existingByCode) {
      throw new CustomException(ErrorCode.ERR_20001, '用户组编码已存在');
    }

    const existingByName = await this.userGroupRepo.findOne({
      where: { name: dto.name },
    });
    
    if (existingByName) {
      throw new CustomException(ErrorCode.ERR_20001, '用户组名称已存在');
    }

    const userGroup = this.userGroupRepo.create(dto);
    return this.userGroupRepo.save(userGroup);
  }

  /**
   * 分页查询用户组列表
   * @param query 查询参数
   * @returns 分页数据
   */
  async findAll(query: GetUserGroupDto) {
    const { pageNo = 1, pageSize = 10, keyword } = query;

    const queryBuilder = this.userGroupRepo
      .createQueryBuilder('userGroup')
      .leftJoinAndSelect('userGroup.members', 'members')
      .leftJoinAndSelect('userGroup.permissions', 'permissions');

    if (keyword) {
      queryBuilder.where(
        'userGroup.name LIKE :keyword OR userGroup.code LIKE :keyword',
        { keyword: `%${keyword}%` },
      );
    }

    const [pageData, total] = await queryBuilder
      .orderBy('userGroup.sort', 'ASC')
      .addOrderBy('userGroup.id', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { pageData, total };
  }

  /**
   * 查询单个用户组
   * @param id 用户组ID
   * @returns 用户组实体
   */
  async findOne(id: number): Promise<UserGroup> {
    const userGroup = await this.userGroupRepo.findOne({
      where: { id },
      relations: { members: true, permissions: true },
    });

    if (!userGroup) {
      throw new CustomException(ErrorCode.ERR_20002, '用户组不存在');
    }

    return userGroup;
  }

  /**
   * 更新用户组
   * @param id 用户组ID
   * @param dto 更新数据
   * @returns 更新后的用户组实体
   */
  async update(id: number, dto: UpdateUserGroupDto): Promise<UserGroup> {
    this.logger.log(`Updating user group: ${id}`);

    const userGroup = await this.findOne(id);

    if (dto.code && dto.code !== userGroup.code) {
      const existingByCode = await this.userGroupRepo.findOne({
        where: { code: dto.code },
      });
      
      if (existingByCode) {
        throw new CustomException(ErrorCode.ERR_20001, '用户组编码已存在');
      }
    }

    if (dto.name && dto.name !== userGroup.name) {
      const existingByName = await this.userGroupRepo.findOne({
        where: { name: dto.name },
      });
      
      if (existingByName) {
        throw new CustomException(ErrorCode.ERR_20001, '用户组名称已存在');
      }
    }

    await this.userGroupRepo.update(id, dto);
    return this.findOne(id);
  }

  /**
   * 删除用户组
   * @param id 用户组ID
   * @returns 删除成功返回 true
   */
  async remove(id: number): Promise<boolean> {
    this.logger.log(`Removing user group: ${id}`);

    const userGroup = await this.findOne(id);
    await this.userGroupRepo.remove(userGroup);
    return true;
  }

  /**
   * 添加用户组成员
   * @param id 用户组ID
   * @param dto 成员添加数据
   * @returns 更新后的用户组实体
   */
  async addMembers(id: number, dto: AddMembersDto): Promise<UserGroup> {
    this.logger.log(`Adding members to user group: ${id}`);

    const userGroup = await this.findOne(id);

    const users = await this.userRepo.find({
      where: { id: In(dto.userIds) },
    });

    if (users.length !== dto.userIds.length) {
      throw new CustomException(ErrorCode.ERR_20002, '部分用户不存在');
    }

    const existingMemberIds = new Set(userGroup.members.map((m) => m.id));
    const newMembers = users.filter((u) => !existingMemberIds.has(u.id));

    if (newMembers.length > 0) {
      userGroup.members = [...userGroup.members, ...newMembers];
      await this.userGroupRepo.save(userGroup);
    }

    return this.findOne(id);
  }

  /**
   * 移除用户组成员
   * @param id 用户组ID
   * @param userId 用户ID
   * @returns 更新后的用户组实体
   */
  async removeMember(id: number, userId: number): Promise<UserGroup> {
    this.logger.log(`Removing member ${userId} from user group: ${id}`);

    const userGroup = await this.findOne(id);
    userGroup.members = userGroup.members.filter((m) => m.id !== userId);
    await this.userGroupRepo.save(userGroup);

    return this.findOne(id);
  }

  /**
   * 设置用户组权限
   * @param id 用户组ID
   * @param dto 权限设置数据
   * @returns 更新后的用户组实体
   */
  async setPermissions(id: number, dto: SetPermissionsDto): Promise<UserGroup> {
    this.logger.log(`Setting permissions for user group: ${id}`);

    const userGroup = await this.findOne(id);

    const permissions = await this.permissionRepo.find({
      where: { id: In(dto.permissionIds) },
    });

    if (permissions.length !== dto.permissionIds.length) {
      throw new CustomException(ErrorCode.ERR_20002, '部分权限不存在');
    }

    userGroup.permissions = permissions;
    await this.userGroupRepo.save(userGroup);

    return this.findOne(id);
  }

  /**
   * 获取用户组权限列表
   * @param id 用户组ID
   * @returns 权限列表
   */
  async getPermissions(id: number): Promise<Permission[]> {
    this.logger.log(`Getting permissions for user group: ${id}`);

    const userGroup = await this.findOne(id);
    return userGroup.permissions || [];
  }
}
