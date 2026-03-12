import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PasswordHistory } from './entities';
import { PasswordHistoryService } from './password-history.service';
import { SecurityConfigModule } from '@/modules/security-config/security-config.module';

@Module({
  imports: [TypeOrmModule.forFeature([PasswordHistory]), SecurityConfigModule],
  providers: [PasswordHistoryService],
  exports: [PasswordHistoryService],
})
export class PasswordHistoryModule {}
