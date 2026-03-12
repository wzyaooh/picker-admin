// 第三方库
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

// 项目内部模块
import { JwtGuard } from '@/common/guards/jwt.guard';
import { RoleGuard } from '@/common/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';

// 相对路径导入
import { UserGroupService } from './user-group.service';
import {
  CreateUserGroupDto,
  UpdateUserGroupDto,
  GetUserGroupDto,
  AddMembersDto,
  SetPermissionsDto,
} from './dto';

/**
 * 用户组控制器
 * 提供用户组管理相关的 HTTP 接口，包括用户组的增删改查、成员管理、权限管理等功能
 */
@ApiTags('用户组管理')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard, RoleGuard)
@Controller('user-group')
export class UserGroupController {
  constructor(private readonly userGroupService: UserGroupService) {}

  /**
   * 创建用户组
   * @param dto 创建用户组数据传输对象
   * @returns 创建的用户组信息
   */
  @Post()
  @Roles('SUPER_ADMIN')
  @Audit({ description: '创建用户组', saveReqBody: true })
  @ApiOperation({ summary: '创建用户组' })
  create(@Body() dto: CreateUserGroupDto) {
    return this.userGroupService.create(dto);
  }

  /**
   * 查询用户组列表
   * @param query 查询参数
   * @returns 用户组列表
   */
  @Get()
  @ApiOperation({ summary: '查询用户组列表' })
  findAll(@Query() query: GetUserGroupDto) {
    return this.userGroupService.findAll(query);
  }

  /**
   * 查询用户组详情
   * @param id 用户组ID
   * @returns 用户组详细信息
   */
  @Get(':id')
  @ApiOperation({ summary: '查询用户组详情' })
  findOne(@Param('id') id: string) {
    return this.userGroupService.findOne(+id);
  }

  /**
   * 更新用户组
   * @param id 用户组ID
   * @param dto 更新用户组数据传输对象
   * @returns 更新后的用户组信息
   */
  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '更新用户组', saveReqBody: true })
  @ApiOperation({ summary: '更新用户组' })
  update(@Param('id') id: string, @Body() dto: UpdateUserGroupDto) {
    return this.userGroupService.update(+id, dto);
  }

  /**
   * 删除用户组
   * @param id 用户组ID
   * @returns 删除结果
   */
  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除用户组' })
  @ApiOperation({ summary: '删除用户组' })
  remove(@Param('id') id: string) {
    return this.userGroupService.remove(+id);
  }

  /**
   * 添加用户组成员
   * @param id 用户组ID
   * @param dto 添加成员数据传输对象
   * @returns 添加结果
   */
  @Post(':id/members')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '添加用户组成员', saveReqBody: true })
  @ApiOperation({ summary: '添加用户组成员' })
  addMembers(@Param('id') id: string, @Body() dto: AddMembersDto) {
    return this.userGroupService.addMembers(+id, dto);
  }

  /**
   * 移除用户组成员
   * @param id 用户组ID
   * @param userId 用户ID
   * @returns 移除结果
   */
  @Delete(':id/members/:userId')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '移除用户组成员' })
  @ApiOperation({ summary: '移除用户组成员' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.userGroupService.removeMember(+id, +userId);
  }

  /**
   * 设置用户组权限
   * @param id 用户组ID
   * @param dto 设置权限数据传输对象
   * @returns 设置结果
   */
  @Post(':id/permissions')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '设置用户组权限', saveReqBody: true })
  @ApiOperation({ summary: '设置用户组权限' })
  setPermissions(@Param('id') id: string, @Body() dto: SetPermissionsDto) {
    return this.userGroupService.setPermissions(+id, dto);
  }

  /**
   * 获取用户组权限
   * @param id 用户组ID
   * @returns 用户组的权限列表
   */
  @Get(':id/permissions')
  @ApiOperation({ summary: '获取用户组权限' })
  getPermissions(@Param('id') id: string) {
    return this.userGroupService.getPermissions(+id);
  }
}
