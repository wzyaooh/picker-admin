import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { RoleGuard } from '@/common/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto, UpdateApiKeyDto, QueryApiKeyDto } from './dto';

@ApiTags('API Key 管理')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard, RoleGuard)
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  @Audit({ description: '创建 API Key', saveReqBody: true })
  @ApiOperation({ summary: '创建 API Key', description: '生成新的 API Key' })
  @ApiResponse({ status: 201, description: 'API Key 创建成功' })
  async create(@Body() createDto: CreateApiKeyDto, @Request() req: any) {
    const result = await this.apiKeyService.create(createDto, req.user?.id);
    return {
      apiKey: {
        ...result,
        fullKey: undefined, // 不返回完整密钥到响应体中
      },
      fullKey: result.fullKey, // 单独返回完整密钥
    };
  }

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: '获取 API Key 列表', description: '分页查询 API Key 列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findAll(@Query() query: QueryApiKeyDto) {
    const result = await this.apiKeyService.findAll(query);
    return {
      pageData: result.items.map(item => ({
        ...item,
        keyPrefix: item.keyPrefix, // 只返回前缀
      })),
      total: result.total,
    };
  }

  @Get('permissions')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: '获取可用权限列表', description: '获取 API Key 可分配的权限列表' })
  @ApiResponse({ status: 200, description: '权限列表' })
  async getAvailablePermissions() {
    return this.apiKeyService.getAvailablePermissions();
  }

  @Get('logs')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: '获取访问日志', description: '获取 API Key 访问日志' })
  @ApiResponse({ status: 200, description: '访问日志' })
  async getLogs(@Query() query: any) {
    return this.apiKeyService.getLogs(query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: '获取 API Key 详情', description: '根据 ID 获取 API Key 详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findOne(@Param('id') id: string) {
    const apiKey = await this.apiKeyService.findOne(id);
    if (!apiKey) {
      throw new Error('API Key 不存在');
    }
    return {
      ...apiKey,
      keyPrefix: apiKey.keyPrefix, // 只返回前缀
    };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '更新 API Key', saveReqBody: true })
  @ApiOperation({ summary: '更新 API Key', description: '更新 API Key 信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateApiKeyDto) {
    const result = await this.apiKeyService.update(id, updateDto);
    return {
      ...result,
      keyPrefix: result.keyPrefix, // 只返回前缀
    };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除 API Key' })
  @ApiOperation({ summary: '删除 API Key', description: '删除指定的 API Key' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string) {
    const success = await this.apiKeyService.remove(id);
    return { success };
  }

  @Patch(':id/toggle')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '启用/禁用 API Key' })
  @ApiOperation({ summary: '启用/禁用 API Key', description: '切换 API Key 的启用状态' })
  @ApiResponse({ status: 200, description: '操作成功' })
  async toggle(@Param('id') id: string, @Body() body: { enabled: boolean }) {
    const result = await this.apiKeyService.update(id, { enabled: body.enabled });
    return {
      ...result,
      keyPrefix: result.keyPrefix, // 只返回前缀
    };
  }

  @Post(':id/regenerate')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '重新生成 API Key' })
  @ApiOperation({ summary: '重新生成 API Key', description: '重新生成指定的 API Key' })
  @ApiResponse({ status: 200, description: '重新生成成功' })
  async regenerate(@Param('id') id: string) {
    const result = await this.apiKeyService.regenerate(id);
    return {
      apiKey: {
        ...result,
        fullKey: undefined, // 不返回完整密钥到响应体中
      },
      fullKey: result.fullKey, // 单独返回完整密钥
    };
  }

  @Get(':id/stats')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: '获取 API Key 使用统计', description: '获取指定 API Key 的使用统计' })
  @ApiResponse({ status: 200, description: '统计数据' })
  async getStats(@Param('id') id: string) {
    return this.apiKeyService.getStats(id);
  }

  @Post('validate')
  @ApiOperation({ summary: '验证 API Key', description: '验证 API Key 是否有效（内部接口）' })
  @ApiResponse({ status: 200, description: '验证结果' })
  async validate(@Body() body: { apiKey: string }) {
    return await this.apiKeyService.validateApiKey(body.apiKey);
  }

  @Post('record-usage')
  @ApiOperation({ summary: '记录API使用统计', description: '记录API Key的使用统计（内部接口）' })
  @ApiResponse({ status: 200, description: '记录成功' })
  async recordUsage(@Body() body: { apiKeyId: string; responseTime: number }) {
    await this.apiKeyService.recordUsage(body.apiKeyId, body.responseTime);
    return { success: true };
  }
}
