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

import { MenuService } from './menu.service';
import { CreateMenuDto, UpdateMenuDto, QueryMenuDto } from './dto';

/**
 * 客户端菜单控制器
 * 提供客户端菜单的增删改查、树形结构查询、按钮权限查询等功能
 */
@ApiTags('客户端菜单')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard)
@Controller('client/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /**
   * 创建客户端菜单
   * @param createMenuDto 创建参数
   * @returns 创建的菜单信息
   */
  @Post()
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '创建客户端菜单', saveReqBody: true })
  @ApiOperation({ summary: '创建客户端菜单' })
  create(@Body() createMenuDto: CreateMenuDto): Promise<any> {
    return this.menuService.create(createMenuDto);
  }

  /**
   * 批量创建客户端菜单
   * @param createMenuDtos 批量创建参数
   * @returns 创建结果
   */
  @Post('batch')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '批量创建客户端菜单', saveReqBody: true })
  @ApiOperation({ summary: '批量创建客户端菜单' })
  batchCreate(@Body() createMenuDtos: CreateMenuDto[]): Promise<any> {
    return this.menuService.batchCreate(createMenuDtos);
  }

  /**
   * 查询客户端菜单树
   * @param query 查询参数
   * @returns 树形结构的菜单列表
   */
  @Get('tree')
  @Audit({ description: '查询客户端菜单树' })
  @ApiOperation({ summary: '查询客户端菜单树' })
  findTree(@Query() query: QueryMenuDto): Promise<any> {
    return this.menuService.findTree(query);
  }

  /**
   * 查询菜单的按钮权限
   * @param menuId 菜单ID
   * @returns 按钮权限列表
   */
  @Get('button/:menuId')
  @Audit({ description: '查询菜单的按钮权限' })
  @ApiOperation({ summary: '查询菜单的按钮权限' })
  findButtons(@Param('menuId', ParseIntPipe) menuId: number): Promise<any> {
    return this.menuService.findButtons(menuId);
  }

  /**
   * 查询客户端菜单详情
   * @param id 菜单ID
   * @returns 菜单详细信息
   */
  @Get(':id')
  @Audit({ description: '查询客户端菜单详情' })
  @ApiOperation({ summary: '查询客户端菜单详情' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.menuService.findOne(id);
  }

  /**
   * 更新客户端菜单
   * @param id 菜单ID
   * @param updateMenuDto 更新参数
   * @returns 更新后的菜单信息
   */
  @Patch(':id')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '更新客户端菜单', saveReqBody: true })
  @ApiOperation({ summary: '更新客户端菜单' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMenuDto: UpdateMenuDto,
  ): Promise<any> {
    return this.menuService.update(id, updateMenuDto);
  }

  /**
   * 删除客户端菜单
   * @param id 菜单ID
   * @returns 删除结果
   */
  @Delete(':id')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除客户端菜单' })
  @ApiOperation({ summary: '删除客户端菜单' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.menuService.remove(id);
  }
}
