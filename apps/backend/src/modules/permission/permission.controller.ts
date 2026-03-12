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
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

// 项目内部模块
import { JwtGuard, PreviewGuard } from '@/common/guards';
import { Cacheable, CacheEvict, Audit } from '@/common/decorators';
import { CacheInterceptor } from '@/common/interceptors/cache.interceptor';
import { CacheEvictInterceptor } from '@/common/interceptors/cache-evict.interceptor';

// 相对路径导入
import { PermissionService } from './permission.service';
import { CreatePermissionDto, UpdatePermissionDto } from './dto';

/**
 * 权限控制器
 * 提供权限管理相关的 HTTP 接口，包括权限的增删改查、权限树查询、菜单树查询等功能
 */
@ApiTags('权限')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard)
@UseInterceptors(CacheInterceptor, CacheEvictInterceptor)
@Controller('permission')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  /**
   * 创建权限节点
   * @param createPermissionDto 创建权限数据传输对象
   * @returns 创建的权限节点信息
   */
  @Post()
  @UseGuards(PreviewGuard)
  @CacheEvict('permission:tree', 'permission:menu:tree', 'permission:all')
  @Audit({ description: '创建权限节点' })
  @ApiOperation({ summary: '创建权限节点' })
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionService.create(createPermissionDto);
  }

  /**
   * 批量创建权限节点
   * @param createPermissionDtos 创建权限数据传输对象数组
   * @returns 批量创建结果
   */
  @Post('batch')
  @UseGuards(PreviewGuard)
  @CacheEvict('permission:tree', 'permission:menu:tree', 'permission:all')
  @Audit({ description: '批量创建权限节点' })
  @ApiOperation({ summary: '批量创建权限节点' })
  batchCreate(@Body() createPermissionDtos: CreatePermissionDto[]) {
    return this.permissionService.batchCreate(createPermissionDtos);
  }

  /**
   * 查询所有权限（扁平列表）
   * @returns 所有权限节点的扁平列表
   */
  @Get()
  @Cacheable('permission:all', 600)
  @Audit({ description: '查询所有权限（扁平列表）' })
  @ApiOperation({ summary: '查询所有权限（扁平列表）' })
  findAll() {
    return this.permissionService.findAll();
  }

  /**
   * 查询完整权限树（四层结构）
   * @returns 完整的四层权限树结构
   */
  @Get('tree')
  @Cacheable('permission:tree', 600)
  @Audit({ description: '查询完整权限树（四层结构）' })
  @ApiOperation({ summary: '查询完整权限树（四层结构）' })
  findAllTree() {
    return this.permissionService.findAllTree();
  }

  /**
   * 查询菜单树（带权限过滤）
   * @param req 请求对象（包含当前用户信息）
   * @param moduleCode 模块编码（可选，用于过滤特定模块的菜单）
   * @returns 当前用户有权限的菜单树结构
   */
  @Get('menu/tree')
  @Audit({ description: '查询菜单树（带权限过滤）' })
  @ApiOperation({ summary: '查询菜单树（带权限过滤）' })
  @ApiQuery({ name: 'moduleCode', required: false, description: '模块编码，用于过滤特定模块的菜单' })
  findMenuTree(@Req() req: any, @Query('moduleCode') moduleCode?: string) {
    return this.permissionService.getMenuTree(req.user.userId, moduleCode);
  }

  /**
   * 查询所有模块
   * @param req 请求对象（包含当前用户信息）
   * @returns 当前用户有权限的所有模块列表
   */
  @Get('modules')
  @Audit({ description: '查询所有模块' })
  @ApiOperation({ summary: '查询所有模块' })
  getModules(@Req() req: any) {
    return this.permissionService.getModules(req.user.userId);
  }

  /**
   * 根据ID查询单个权限节点
   * @param id 权限节点ID
   * @returns 权限节点详细信息
   */
  @Get(':id')
  @Audit({ description: '根据ID查询单个权限节点' })
  @ApiOperation({ summary: '根据 ID 查询单个权限节点' })
  findOne(@Param('id') id: string) {
    return this.permissionService.findOne(+id);
  }

  /**
   * 更新权限节点
   * @param id 权限节点ID
   * @param updatePermissionDto 更新权限数据传输对象
   * @returns 更新后的权限节点信息
   */
  @Patch(':id')
  @UseGuards(PreviewGuard)
  @CacheEvict('permission:tree', 'permission:menu:tree', 'permission:all')
  @Audit({ description: '更新权限节点' })
  @ApiOperation({ summary: '更新权限节点' })
  update(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto) {
    return this.permissionService.update(+id, updatePermissionDto);
  }

  /**
   * 删除权限节点
   * @param id 权限节点ID
   * @returns 删除结果
   */
  @Delete(':id')
  @UseGuards(PreviewGuard)
  @CacheEvict('permission:tree', 'permission:menu:tree', 'permission:all')
  @Audit({ description: '删除权限节点' })
  @ApiOperation({ summary: '删除权限节点' })
  remove(@Param('id') id: string) {
    return this.permissionService.remove(+id);
  }

  /**
   * 查询指定父节点下的按钮权限
   * @param parentId 父节点ID（MENU类型）
   * @returns 按钮权限列表
   */
  @Get('button/:parentId')
  @Audit({ description: '查询指定父节点下的按钮权限' })
  @ApiOperation({ summary: '查询指定父节点下的按钮权限' })
  findButton(@Param('parentId') parentId: string) {
    return this.permissionService.findButton(+parentId);
  }

  /**
   * 清理权限缓存
   * @returns 清理结果
   */
  @Post('cache/clear')
  @UseGuards(PreviewGuard)
  @CacheEvict('permission:tree', 'permission:menu:tree', 'permission:all')
  @Audit({ description: '清理权限缓存' })
  @ApiOperation({ summary: '清理权限缓存' })
  clearCache() {
    return this.permissionService.clearCache();
  }

  /**
   * 校验菜单路径是否唯一
   * @param path 菜单路径
   * @param id 菜单ID（更新时排除自身）
   * @returns 校验结果
   */
  @Get('menu/validate')
  @Audit({ description: '校验菜单路径是否唯一' })
  @ApiOperation({ summary: '校验菜单路径是否唯一' })
  @ApiQuery({ name: 'path', required: true, description: '菜单路径' })
  @ApiQuery({ name: 'id', required: false, description: '菜单ID（更新时排除自身）' })
  validateMenuPathUnique(@Query('path') path: string, @Query('id') id?: string) {
    return this.permissionService.validateMenuPathUnique(path, id ? +id : undefined);
  }
}
