// 第三方库
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

// 项目内部模块
import { JwtGuard, RoleGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';

// 相对路径导入
import { DictService } from './dict.service';
import {
  CreateDictDto,
  QueryDictDto,
  UpdateDictDto,
  CreateDictItemDto,
  UpdateDictItemDto,
} from './dto';

/**
 * 字典控制器
 * 提供字典和字典项管理相关的 HTTP 接口，包括字典的增删改查、字典项的增删改查等功能
 */
@ApiTags('字典管理')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard, RoleGuard)
@Controller('dict')
export class DictController {
  constructor(private readonly dictService: DictService) {}

  /**
   * 创建字典
   * @param dto 创建字典数据传输对象
   * @returns 创建的字典信息
   */
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Audit({ description: '创建字典', saveReqBody: true })
  @ApiOperation({ summary: '创建字典' })
  create(@Body() dto: CreateDictDto) {
    return this.dictService.create(dto);
  }

  /**
   * 分页查询字典列表
   * @param query 查询参数（分页、关键字、启用状态等）
   * @returns 字典分页数据
   */
  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: '分页查询字典列表' })
  findAll(@Query() query: QueryDictDto) {
    return this.dictService.findAll(query);
  }

  /**
   * 查询所有字典（不分页）
   * @returns 所有字典列表
   */
  @Get('all')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: '查询所有字典' })
  findAllWithoutPagination() {
    return this.dictService.findAllWithoutPagination();
  }

  /**
   * 根据 ID 查询字典详情
   * @param id 字典ID
   * @returns 字典详细信息
   */
  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: '查询字典详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dictService.findOne(id);
  }

  /**
   * 根据编码查询字典
   * @param code 字典编码
   * @returns 字典详细信息
   */
  @Get('code/:code')
  @ApiOperation({ summary: '根据编码查询字典' })
  findByCode(@Param('code') code: string) {
    return this.dictService.findByCode(code);
  }

  /**
   * 更新字典
   * @param id 字典ID
   * @param dto 更新字典数据传输对象
   * @returns 更新后的字典信息
   */
  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Audit({ description: '更新字典', saveReqBody: true })
  @ApiOperation({ summary: '更新字典' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDictDto) {
    return this.dictService.update(id, dto);
  }

  /**
   * 删除字典
   * @param id 字典ID
   * @returns 删除结果
   */
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Audit({ description: '删除字典' })
  @ApiOperation({ summary: '删除字典' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.dictService.remove(id);
  }

  // ==================== 字典项管理端点 ====================

  /**
   * 创建字典项
   * @param id 字典ID
   * @param dto 创建字典项数据传输对象
   * @returns 创建的字典项信息
   */
  @Post(':id/items')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Audit({ description: '创建字典项', saveReqBody: true })
  @ApiOperation({ summary: '创建字典项' })
  createItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDictItemDto,
  ) {
    return this.dictService.createItem(id, dto);
  }

  /**
   * 查询字典的所有字典项
   * @param id 字典ID
   * @returns 字典项列表
   */
  @Get(':id/items')
  @ApiOperation({ summary: '查询字典项列表' })
  findItems(@Param('id', ParseIntPipe) id: number) {
    return this.dictService.findItems(id);
  }

  /**
   * 根据字典编码查询字典项
   * @param code 字典编码
   * @returns 字典项列表
   */
  @Get('code/:code/items')
  @ApiOperation({ summary: '根据字典编码查询字典项' })
  findItemsByCode(@Param('code') code: string) {
    return this.dictService.findItemsByCode(code);
  }

  /**
   * 更新字典项
   * @param id 字典ID
   * @param itemId 字典项ID
   * @param dto 更新字典项数据传输对象
   * @returns 更新后的字典项信息
   */
  @Patch(':id/items/:itemId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Audit({ description: '更新字典项', saveReqBody: true })
  @ApiOperation({ summary: '更新字典项' })
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateDictItemDto,
  ) {
    return this.dictService.updateItem(id, itemId, dto);
  }

  /**
   * 删除字典项
   * @param id 字典ID
   * @param itemId 字典项ID
   * @returns 删除结果
   */
  @Delete(':id/items/:itemId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Audit({ description: '删除字典项' })
  @ApiOperation({ summary: '删除字典项' })
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.dictService.removeItem(id, itemId);
  }
}
