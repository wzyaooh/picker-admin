import { Global, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Profile } from './entities';
import { Role } from '@/modules/role/entities';
import { PasswordHistoryModule } from '@/modules/password-history/password-history.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile, Role]),
    PasswordHistoryModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
