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
import { JwtGuard, PreviewGuard, RoleGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators';

// 相对路径导入
import { DepartmentService } from './department.service';
import { CreateDepartmentDto, UpdateDepartmentDto, QueryDepartmentDto } from './dto';

/**
 * 部门控制器
 * 提供部门管理相关的 HTTP 接口，包括部门的增删改查、树形结构查询等功能
 */
@ApiTags('部门')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard, RoleGuard)
@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  /**
   * 创建部门
   * @param createDepartmentDto 创建部门数据传输对象
   * @returns 创建的部门信息
   */
  @Post()
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN', 'SYS_ADMIN')
  @Audit({ description: '创建部门', saveReqBody: true })
  @ApiOperation({ summary: '创建部门' })
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.create(createDepartmentDto);
  }

  /**
   * 查询所有部门
   * @param query 查询参数（可选的名称和启用状态筛选）
   * @returns 部门列表（扁平结构）
   */
  @Get()
  @Audit({ description: '查询所有部门' })
  @ApiOperation({ summary: '查询所有部门' })
  findAll(@Query() query: QueryDepartmentDto) {
    return this.departmentService.findAll(query);
  }

  /**
   * 查询部门树
   * @returns 部门树形结构
   */
  @Get('tree')
  @Audit({ description: '查询部门树' })
  @ApiOperation({ summary: '查询部门树' })
  findTree() {
    return this.departmentService.findTree();
  }

  /**
   * 查询部门详情
   * @param id 部门ID
   * @returns 部门详细信息
   */
  @Get(':id')
  @Audit({ description: '查询部门详情' })
  @ApiOperation({ summary: '查询部门详情' })
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(+id);
  }

  /**
   * 更新部门信息
   * @param id 部门ID
   * @param updateDepartmentDto 更新部门数据传输对象
   * @returns 更新后的部门信息
   */
  @Patch(':id')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN', 'SYS_ADMIN')
  @Audit({ description: '更新部门信息', saveReqBody: true })
  @ApiOperation({ summary: '更新部门信息' })
  update(@Param('id') id: string, @Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentService.update(+id, updateDepartmentDto);
  }

  /**
   * 删除部门
   * @param id 部门ID
   * @returns 删除结果
   */
  @Delete(':id')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除部门' })
  @ApiOperation({ summary: '删除部门' })
  remove(@Param('id') id: string) {
    return this.departmentService.remove(+id);
  }
}
