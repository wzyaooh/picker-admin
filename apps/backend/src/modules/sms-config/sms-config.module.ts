import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsConfig } from './entities';
import { SmsConfigService } from './sms-config.service';
import { SmsConfigController } from './sms-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SmsConfig])],
  controllers: [SmsConfigController],
  providers: [SmsConfigService],
  exports: [SmsConfigService],
})
export class SmsConfigModule {}
