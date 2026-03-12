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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

// 项目内部模块
import { JwtGuard, PreviewGuard, RoleGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators';

// 相对路径导入
import { RoleService } from './role.service';
import {
  AddRolePermissionsDto,
  AddRoleUsersDto,
  CreateRoleDto,
  GetRolesDto,
  QueryRoleDto,
  QueryRoleUsersDto,
  UpdateRoleDto,
} from './dto';

/**
 * 角色控制器
 * 提供角色管理相关的 HTTP 接口，包括角色的增删改查、权限分配、用户分配等功能
 */
@ApiTags('角色')
@ApiBearerAuth('bearer')
@Controller('role')
@UseGuards(JwtGuard, RoleGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  /**
   * 创建角色
   * @param createRoleDto 创建角色数据传输对象
   * @returns 创建的角色信息
   */
  @Post()
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '创建角色' })
  @ApiOperation({ summary: '创建角色' })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  /**
   * 查询所有角色
   * @param query 查询参数（可选的启用状态筛选）
   * @returns 角色列表
   */
  @Get()
  @Audit({ description: '查询所有角色' })
  @ApiOperation({ summary: '查询所有角色' })
  findAll(@Query() query: GetRolesDto) {
    return this.roleService.findAll(query);
  }

  /**
   * 分页查询角色
   * @param queryDto 分页查询参数
   * @returns 角色分页数据
   */
  @Get('page')
  @Audit({ description: '分页查询角色' })
  @ApiOperation({ summary: '分页查询角色' })
  findPagination(@Query() queryDto: QueryRoleDto) {
    return this.roleService.findPagination(queryDto);
  }

  /**
   * 查询角色权限
   * @param id 角色ID
   * @returns 角色的权限列表
   */
  @Get('permissions')
  @Audit({ description: '查询角色权限' })
  @ApiOperation({ summary: '查询角色权限' })
  findRolePermissions(@Query('id') id: number) {
    return this.roleService.findRolePermissions(+id);
  }

  /**
   * 根据ID查询角色
   * @param id 角色ID
   * @param includeUsers 是否包含用户信息
   * @param includePermissions 是否包含权限信息
   * @returns 角色详细信息
   */
  @Get(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '根据ID查询角色' })
  @ApiOperation({ summary: '根据ID查询角色' })
  @ApiQuery({ name: 'includeUsers', required: false, description: '是否包含用户信息' })
  @ApiQuery({ name: 'includePermissions', required: false, description: '是否包含权限信息' })
  findOne(
    @Param('id') id: string,
    @Query('includeUsers') includeUsers?: string,
    @Query('includePermissions') includePermissions?: string,
  ) {
    const includeRelations = includeUsers === 'true' || includePermissions === 'true';
    return this.roleService.findOne(+id, includeRelations);
  }

  /**
   * 更新角色信息
   * @param id 角色ID
   * @param updateRoleDto 更新角色数据传输对象
   * @returns 更新后的角色信息
   */
  @Patch(':id')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN', 'SYS_ADMIN', 'ROLE_PMS')
  @Audit({ description: '更新角色信息' })
  @ApiOperation({ summary: '更新角色信息' })
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(+id, updateRoleDto);
  }

  /**
   * 删除角色
   * @param id 角色ID
   * @returns 删除结果
   */
  @Delete(':id')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除角色' })
  @ApiOperation({ summary: '删除角色' })
  remove(@Param('id') id: number) {
    return this.roleService.remove(+id);
  }

  /**
   * 为角色分配权限
   * @param dto 分配权限数据传输对象
   * @returns 分配结果
   */
  @Post('permissions/add')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '为角色分配权限' })
  @ApiOperation({ summary: '为角色分配权限' })
  addRolePermissions(@Body() dto: AddRolePermissionsDto) {
    return this.roleService.addRolePermissions(dto);
  }

  /**
   * 查询当前角色权限树
   * @param req 请求对象（包含当前用户信息）
   * @returns 权限树结构
   */
  @Get('permissions/tree')
  @Audit({ description: '查询当前角色权限树' })
  @ApiOperation({ summary: '查询当前角色权限树' })
  findRolePermissionsTree(@Request() req: any) {
    return this.roleService.findRolePermissionsTree(req.user.currentRoleCode);
  }

  /**
   * 为角色分配用户
   * @param roleId 角色ID
   * @param dto 分配用户数据传输对象
   * @returns 分配结果
   */
  @Patch('users/add/:roleId')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '为角色分配用户' })
  @ApiOperation({ summary: '为角色分配用户' })
  addRoleUsers(@Param('roleId') roleId: string, @Body() dto: AddRoleUsersDto) {
    return this.roleService.addRoleUsers(+roleId, dto);
  }

  /**
   * 取消角色用户分配
   * @param roleId 角色ID
   * @param dto 取消分配用户数据传输对象
   * @returns 取消分配结果
   */
  @Patch('users/remove/:roleId')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '取消角色用户分配' })
  @ApiOperation({ summary: '取消角色用户分配' })
  removeRoleUsers(@Param('roleId') roleId: string, @Body() dto: AddRoleUsersDto) {
    return this.roleService.removeRoleUsers(+roleId, dto);
  }

  /**
   * 分页查询角色用户
   * @param roleId 角色ID
   * @param query 分页查询参数
   * @returns 角色用户分页数据
   */
  @Get('users/:roleId')
  @Audit({ description: '分页查询角色用户' })
  @ApiOperation({ summary: '分页查询角色用户' })
  findRoleUsers(@Param('roleId') roleId: string, @Query() query: QueryRoleUsersDto) {
    return this.roleService.findRoleUsers(+roleId, query);
  }
}
