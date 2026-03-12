import { hashSync } from 'bcryptjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { USER_CONSTANTS } from '@/constants';
import { Role } from '@/modules/role/entities';
import { PasswordHistoryService } from '@/modules/password-history/password-history.service';

import { CreateUserDto, GetUserDto, UpdateProfileDto, UpdateUserDto } from './dto';
import { User, Profile } from './entities';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRep: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRep: Repository<Profile>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly passwordHistoryService: PasswordHistoryService,
  ) {}

  /**
   * 创建新用户
   * @param user 用户创建数据
   * @returns 创建成功返回 true
   */
  async create(user: CreateUserDto): Promise<boolean> {
    const { username, roleIds } = user;
    
    // 检查用户名是否已存在
    const existUser = await this.findByUsername(username);
    if (existUser) {
      throw new CustomException(ErrorCode.ERR_10001);
    }

    // 创建用户实体
    const newUser = this.userRep.create(user);
    
    // 分配角色
    if (roleIds !== undefined) {
      newUser.roles = await this.roleRepo.find({
        where: { id: In(roleIds) },
      });
    }
    
    // 创建用户资料
    if (!newUser.profile) {
      newUser.profile = this.profileRep.create();
    }
    
    // 加密密码（未提供则使用默认密码）
    const rawPassword = newUser.password || '123456';
    const hashedPassword = hashSync(rawPassword);
    newUser.password = hashedPassword;
    newUser.passwordUpdatedAt = new Date();
    
    // 保存用户
    const savedUser = await this.userRep.save(newUser);
    
    // 保存初始密码历史
    await this.passwordHistoryService.savePasswordHistory(
      savedUser.id,
      hashedPassword,
      undefined,
      '用户注册',
    );
    
    return true;
  }

  async findAll(query: GetUserDto) {
    const pageSize = query.pageSize || 10;
    const pageNo = query.pageNo || 1;

    const queryBuilder = this.userRep
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('user.position', 'position')
      .where('user.username LIKE :username', { username: `%${query.username || ''}%` });

    if (query.enable !== undefined) {
      queryBuilder.andWhere('user.enable = :enable', { enable: query.enable });
    }

    if (query.gender !== undefined) {
      queryBuilder.andWhere('profile.gender = :gender', { gender: query.gender });
    }

    if (query.departmentId !== undefined) {
      queryBuilder.andWhere('user.departmentId = :departmentId', { departmentId: query.departmentId });
    }

    if (query.positionId !== undefined) {
      queryBuilder.andWhere('user.positionId = :positionId', { positionId: query.positionId });
    }

    const [users, total] = await queryBuilder
      .orderBy('user.createTime', 'ASC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const pageData = users.map((item) => {
      const { profile, department, position, ...rest } = item;
      return { 
        ...rest, 
        ...profile,
        department: department ? {
          id: department.id,
          name: department.name,
          code: department.code,
        } : null,
        position: position ? {
          id: position.id,
          name: position.name,
          code: position.code,
        } : null,
      };
    });

    return { pageData, total };
  }

  async remove(id: number) {
    if (id === USER_CONSTANTS.ROOT_USER_ID) {
      throw new CustomException(ErrorCode.ERR_11006, '不能删除根用户');
    }
    await this.userRep.delete(id);
    await this.profileRep
      .createQueryBuilder('profile')
      .delete()
      .where('profile.userId = :id', { id })
      .execute();
    return true;
  }

  async update(id: number, user: UpdateUserDto) {
    const findUser = await this.findUserProfile(id);
    if (!findUser) {
      throw new CustomException(ErrorCode.ERR_10002, '用户不存在');
    }
    if (user.roleIds !== undefined) {
      findUser.roles = await this.roleRepo.find({
        where: { id: In(user.roleIds) },
      });
    }
    const newUser = this.userRep.merge(findUser, user);
    await this.userRep.save(newUser);
    return true;
  }

  async resetPassword(id: number, password: string) {
    const user = await this.userRep.findOne({ where: { id } });
    if (!user) {
      throw new CustomException(ErrorCode.ERR_10002, '用户不存在');
    }
    
    const hashedPassword = hashSync(password);
    
    // 更新用户密码
    user.password = hashedPassword;
    user.passwordUpdatedAt = new Date();
    // 密码重置后，不再要求用户修改密码
    user.mustChangePassword = false;
    await this.userRep.save(user);
    
    // 保存密码历史（会自动清理旧记录）
    await this.passwordHistoryService.savePasswordHistory(
      id,
      hashedPassword,
      undefined,
      '密码重置',
    );
    
    return true;
  }

  async updateProfile(id: number, profile: UpdateProfileDto) {
    const user = await this.findUserProfile(id);
    if (!user) {
      throw new CustomException(ErrorCode.ERR_10002, '用户不存在');
    }
    user.profile = this.profileRep.merge(user.profile, profile);
    await this.userRep.save(user);
    return true;
  }

  async findByUsername(username: string) {
    return this.userRep.findOne({
      where: { username },
      select: ['id', 'username', 'password', 'enable', 'passwordUpdatedAt', 'mustChangePassword'],
      relations: {
        profile: true,
        roles: {
          permissions: true,
        },
      },
    });
  }

  findUserProfile(id: number) {
    return this.userRep.findOne({
      where: { id },
      relations: {
        profile: true,
        roles: true,
        department: true,
        position: true,
      },
    });
  }

  async findUserDetail(id: number, roleCode: string) {
    const user = await this.userRep.findOne({
      where: { id },
      relations: {
        profile: true,
        roles: true,
        department: true,
        position: true,
      },
    });
    if (!user) {
      throw new CustomException(ErrorCode.ERR_10002, '用户不存在');
    }
    const currentRole = user.roles?.find((item: any) => item.code === roleCode && item.enable);
    if (!currentRole) {
      throw new CustomException(ErrorCode.ERR_11005, '您目前暂无此角色或已被禁用，请联系管理员');
    }
    return { ...user, currentRole };
  }

  async addRoles(userId: number, roleIds: number[]) {
    const user = await this.userRep.findOne({
      where: { id: userId },
      relations: { roles: true },
    });
    if (!user) {
      throw new CustomException(ErrorCode.ERR_10002, '用户不存在');
    }
    const roles = await this.roleRepo.find({
      where: roleIds.map((item) => ({ id: item })),
    });
    user.roles = user.roles.filter((item: any) => !roleIds.includes(item.id)).concat(roles);
    await this.userRep.save(user);
    return true;
  }

  /**
   * 更新用户登录信息
   * @param userId 用户ID
   * @param ipAddress 登录IP地址
   */
  async updateLoginInfo(userId: number, ipAddress?: string) {
    const user = await this.userRep.findOne({ where: { id: userId } });
    if (!user) {
      return;
    }
    user.lastLoginAt = new Date();
    if (ipAddress) {
      user.lastLoginIp = ipAddress;
    }
    await this.userRep.save(user);
  }
}
