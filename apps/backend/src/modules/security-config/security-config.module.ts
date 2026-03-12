import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityConfig } from './entities';
import { SecurityConfigService } from './security-config.service';
import { SecurityConfigInitService } from './security-config-init.service';
import { SecurityConfigController } from './security-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SecurityConfig])],
  controllers: [SecurityConfigController],
  providers: [SecurityConfigService, SecurityConfigInitService],
  exports: [SecurityConfigService, SecurityConfigInitService],
})
export class SecurityConfigModule {}
