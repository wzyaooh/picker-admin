import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientUserService } from './user.service';
import { ClientUserController } from './user.controller';
import { ClientUser } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([ClientUser])],
  controllers: [ClientUserController],
  providers: [ClientUserService],
  exports: [ClientUserService],
})
export class ClientUserModule {}
