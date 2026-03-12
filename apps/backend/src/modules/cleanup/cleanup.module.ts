import { Module } from '@nestjs/common';

import { AuditModule } from '@/modules/audit/audit.module';
import { PasswordHistoryModule } from '@/modules/password-history/password-history.module';
import { SecurityConfigModule } from '@/modules/security-config/security-config.module';

import { CleanupScheduler } from './cleanup.service';

@Module({
  imports: [AuditModule, PasswordHistoryModule, SecurityConfigModule],
  providers: [CleanupScheduler],
})
export class CleanupModule {}
