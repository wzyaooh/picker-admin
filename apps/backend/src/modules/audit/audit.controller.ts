// 第三方库
import { Controller, Get, Query, UseGuards, Param, ParseIntPipe, Post, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

// 项目内部模块
import { JwtGuard, RoleGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators';

// 相对路径导入
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

/**
 * 审计日志控制器
 * 提供审计日志查询相关的 HTTP 接口
 */
@ApiTags('审计日志')
@ApiBearerAuth('bearer')
@Controller('audit')
@UseGuards(JwtGuard, RoleGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * 查询最近审计日志
   * @param take 查询数量（默认20条）
   * @returns 最近的审计日志记录列表
   */
  @Get('recent')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '查询最近审计日志' })
  @ApiOperation({ summary: '查询最近审计日志' })
  recent(@Query('take') take?: string) {
    const n = take ? Number(take) : 20;
    return this.auditService.findRecent(Number.isFinite(n) ? n : 20);
  }

  /**
   * 分页查询审计日志
   * @param query 查询参数
   * @returns 分页的审计日志列表
   */
  @Get()
  @Roles('SUPER_ADMIN')
  @Audit({ description: '查询审计日志列表' })
  @ApiOperation({ summary: '分页查询审计日志' })
  findAll(@Query() query: QueryAuditDto) {
    return this.auditService.findAll(query);
  }

  /**
   * 获取审计日志统计信息
   * @returns 统计信息
   */
  @Get('statistics')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '查询审计日志统计' })
  @ApiOperation({ summary: '获取审计日志统计信息' })
  getStatistics() {
    return this.auditService.getStatistics();
  }

  /**
   * 查询审计日志详情
   * @param id 日志ID
   * @returns 审计日志详细信息
   */
  @Get(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '查询审计日志详情' })
  @ApiOperation({ summary: '查询审计日志详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditService.findOne(id);
  }

  /**
   * 清理过期的审计日志
   * @param retentionDays 保留天数
   * @returns 删除的记录数
   */
  @Delete('cleanup')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '清理过期审计日志' })
  @ApiOperation({ summary: '清理过期审计日志' })
  @ApiQuery({ name: 'retentionDays', required: false, description: '保留天数，默认90天' })
  async cleanup(@Query('retentionDays') retentionDays?: string) {
    const days = retentionDays ? Number(retentionDays) : 90;
    const deletedCount = await this.auditService.cleanupOldLogs(days);
    return {
      success: true,
      deletedCount,
      message: `已清理 ${deletedCount} 条过期日志`,
    };
  }
}
