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
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { JwtGuard, PreviewGuard } from '@/common/guards';
import { Audit } from '@/common/decorators';
import { Roles } from '@/common/decorators/roles.decorator';

import { ModuleService } from './module.service';
import { CreateModuleDto, UpdateModuleDto, QueryModuleDto } from './dto';

/**
 * 客户端模块控制器
 * 提供客户端模块的增删改查功能
 */
@ApiTags('客户端模块')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard)
@Controller('client/module')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  /**
   * 创建客户端模块
   * @param createModuleDto 创建参数
   * @returns 创建的模块信息
   */
  @Post()
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '创建客户端模块', saveReqBody: true })
  @ApiOperation({ summary: '创建客户端模块' })
  create(@Body() createModuleDto: CreateModuleDto): Promise<any> {
    return this.moduleService.create(createModuleDto);
  }

  /**
   * 查询客户端模块列表
   * @param query 查询参数
   * @returns 模块列表
   */
  @Get()
  @Audit({ description: '查询客户端模块列表' })
  @ApiOperation({ summary: '查询客户端模块列表' })
  findAll(@Query() query: QueryModuleDto): Promise<any> {
    return this.moduleService.findAll(query);
  }

  /**
   * 查询客户端模块详情
   * @param id 模块ID
   * @returns 模块详细信息
   */
  @Get(':id')
  @Audit({ description: '查询客户端模块详情' })
  @ApiOperation({ summary: '查询客户端模块详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.moduleService.findOne(id);
  }

  /**
   * 更新客户端模块
   * @param id 模块ID
   * @param updateModuleDto 更新参数
   * @returns 更新后的模块信息
   */
  @Patch(':id')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '更新客户端模块', saveReqBody: true })
  @ApiOperation({ summary: '更新客户端模块' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateModuleDto: UpdateModuleDto,
  ): Promise<any> {
    return this.moduleService.update(id, updateModuleDto);
  }

  /**
   * 删除客户端模块
   * @param id 模块ID
   * @returns 删除结果
   */
  @Delete(':id')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除客户端模块' })
  @ApiOperation({ summary: '删除客户端模块' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.moduleService.remove(id);
  }
}
