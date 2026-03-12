import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '@/shared/shared.module';
import { DictController } from './dict.controller';
import { DictService } from './dict.service';
import { Dict, DictItem } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dict, DictItem]),
    SharedModule,
  ],
  controllers: [DictController],
  providers: [DictService],
  exports: [DictService],
})
export class DictModule {}
