import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { ClientMenu } from './entities';
import { ClientModule } from '../module/entities/client-module.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClientMenu, ClientModule])],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class ClientMenuModule {}
