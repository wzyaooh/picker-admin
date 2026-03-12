import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { JwtGuard } from '@/common/guards/jwt.guard';
import { RoleGuard } from '@/common/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';

import { StorageConfigService } from './storage-config.service';
import {
  CreateStorageConfigDto,
  UpdateStorageConfigDto,
  QueryStorageConfigDto,
} from './dto';

/**
 * 存储配置控制器
 * 提供存储配置的增删改查、启用/禁用、设置默认等功能
 */
@ApiTags('存储配置')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard, RoleGuard)
@Controller('storage-config')
export class StorageConfigController {
  constructor(private readonly storageConfigService: StorageConfigService) {}

  /**
   * 创建存储配置
   * @param dto 创建参数
   * @returns 创建的存储配置信息
   */
  @Post()
  @Roles('SUPER_ADMIN')
  @Audit({ description: '创建存储配置', saveReqBody: true })
  @ApiOperation({ summary: '创建存储配置' })
  create(@Body() dto: CreateStorageConfigDto): Promise<any> {
    return this.storageConfigService.create(dto);
  }

  /**
   * 查询存储配置列表
   * @param query 查询参数
   * @returns 存储配置列表
   */
  @Get()
  @ApiOperation({ summary: '查询存储配置列表' })
  findAll(@Query() query: QueryStorageConfigDto): Promise<any> {
    return this.storageConfigService.findAll(query);
  }

  /**
   * 获取默认存储配置
   * @returns 默认存储配置信息
   */
  @Get('default')
  @ApiOperation({ summary: '获取默认存储配置' })
  getDefault(): Promise<any> {
    return this.storageConfigService.getDefault();
  }

  /**
   * 查询存储配置详情
   * @param id 存储配置ID
   * @returns 存储配置详细信息
   */
  @Get(':id')
  @ApiOperation({ summary: '查询存储配置详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.storageConfigService.findOne(id);
  }

  /**
   * 更新存储配置
   * @param id 存储配置ID
   * @param dto 更新参数
   * @returns 更新后的存储配置信息
   */
  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '更新存储配置', saveReqBody: true })
  @ApiOperation({ summary: '更新存储配置' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStorageConfigDto,
  ): Promise<any> {
    return this.storageConfigService.update(id, dto);
  }

  /**
   * 切换存储配置启用状态
   * @param id 存储配置ID
   * @returns 更新后的启用状态
   */
  @Patch(':id/toggle')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '切换存储配置启用状态' })
  @ApiOperation({ summary: '切换启用状态' })
  toggleEnabled(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.storageConfigService.toggleEnabled(id);
  }

  /**
   * 设置为默认存储配置
   * @param id 存储配置ID
   * @returns 设置结果
   */
  @Patch(':id/set-default')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '设置默认存储配置' })
  @ApiOperation({ summary: '设置为默认存储' })
  setDefault(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.storageConfigService.setDefault(id);
  }

  /**
   * 删除存储配置
   * @param id 存储配置ID
   * @returns 删除结果
   */
  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除存储配置' })
  @ApiOperation({ summary: '删除存储配置' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.storageConfigService.remove(id);
  }
}
