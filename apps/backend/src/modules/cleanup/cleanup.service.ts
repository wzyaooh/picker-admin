import { Injectable, Logger } from '@nestjs/common';

import { AuditService } from '@/modules/audit/audit.service';
import { TaskHandler } from '@/modules/scheduled-task/task-handler.decorator';
import { PasswordHistoryService } from '@/modules/password-history/password-history.service';
import { SecurityConfigService } from '@/modules/security-config/security-config.service';

/**
 * 定时清理调度器
 * 负责定期清理审计日志和过期密码历史
 */
@Injectable()
export class CleanupScheduler {
  private readonly logger = new Logger(CleanupScheduler.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly passwordHistoryService: PasswordHistoryService,
    private readonly securityConfigService: SecurityConfigService,
  ) {}

  @TaskHandler('cleanup-scheduler')
  async handleCleanup() {
    this.logger.log('开始执行定时清理任务');

    // 1. 审计日志清理
    try {
      const auditPolicy = await this.securityConfigService.getAuditPolicy();
      if (auditPolicy.autoCleanup) {
        const deleted = await this.auditService.cleanupOldLogs(auditPolicy.retentionDays);
        this.logger.log(`审计日志清理完成，删除 ${deleted} 条记录`);
      } else {
        this.logger.log('审计日志自动清理未启用，跳过');
      }
    } catch (error) {
      this.logger.error(`审计日志清理失败: ${error.message}`, error.stack);
    }

    // 2. 密码历史清理
    try {
      await this.passwordHistoryService.cleanupAllExpiredPasswords();
      this.logger.log('密码历史清理完成');
    } catch (error) {
      this.logger.error(`密码历史清理失败: ${error.message}`, error.stack);
    }
  }
}
