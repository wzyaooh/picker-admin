import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { AuditService } from './audit.service';

/**
 * 审计日志调试控制器
 * 提供调试模式下的审计日志查询功能
 */
@ApiTags('审计日志调试')
@Controller('audit/debug')
export class AuditDebugController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * 查询最近审计日志（调试）
   * 仅在 AUDIT_DEBUG=true 时可用
   * @param take 查询数量
   * @returns 最近的审计日志记录
   */
  @Get('recent')
  @ApiOperation({ summary: '查询最近审计日志（调试）' })
  recent(@Query('take') take?: string): Promise<any> {
    if (process.env.AUDIT_DEBUG !== 'true') {
      throw new NotFoundException();
    }
    const n = take ? Number(take) : 20;
    return this.auditService.findRecent(Number.isFinite(n) ? n : 20);
  }
}
