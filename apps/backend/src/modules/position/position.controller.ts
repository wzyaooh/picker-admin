// 第三方库
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';

// 项目内部模块
import { JwtGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';

// 相对路径导入
import { PositionService } from './position.service';
import { CreatePositionDto, UpdatePositionDto, QueryPositionDto } from './dto';

/**
 * 岗位控制器
 * 提供岗位管理相关的 HTTP 接口，包括岗位的增删改查等功能
 */
@Controller('position')
@UseGuards(JwtGuard)
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  /**
   * 创建岗位
   * @param dto 创建岗位数据传输对象
   * @returns 创建的岗位信息
   */
  @Post()
  @Roles('SUPER_ADMIN')
  @Audit({ description: '创建岗位', saveReqBody: true })
  create(@Body() dto: CreatePositionDto) {
    return this.positionService.create(dto);
  }

  /**
   * 查询岗位列表
   * @param query 查询参数（可选的筛选条件）
   * @returns 岗位列表
   */
  @Get()
  @Audit({ description: '查询岗位列表' })
  findAll(@Query() query: QueryPositionDto) {
    return this.positionService.findAll(query);
  }

  /**
   * 查询岗位详情
   * @param id 岗位ID
   * @returns 岗位详细信息
   */
  @Get(':id')
  @Audit({ description: '查询岗位详情' })
  findOne(@Param('id') id: string) {
    return this.positionService.findOne(+id);
  }

  /**
   * 更新岗位
   * @param id 岗位ID
   * @param dto 更新岗位数据传输对象
   * @returns 更新后的岗位信息
   */
  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '更新岗位', saveReqBody: true })
  update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.positionService.update(+id, dto);
  }

  /**
   * 删除岗位
   * @param id 岗位ID
   * @returns 删除结果
   */
  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除岗位' })
  remove(@Param('id') id: string) {
    return this.positionService.remove(+id);
  }
}
