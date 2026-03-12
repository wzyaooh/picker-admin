import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGroupService } from './user-group.service';
import { UserGroupController } from './user-group.controller';
import { UserGroup } from './entities';
import { User } from '@/modules/user/entities';
import { Permission } from '@/modules/permission/entities';

@Module({
  imports: [TypeOrmModule.forFeature([UserGroup, User, Permission])],
  controllers: [UserGroupController],
  providers: [UserGroupService],
  exports: [UserGroupService],
})
export class UserGroupModule {}
