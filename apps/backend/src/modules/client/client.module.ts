import { Module } from '@nestjs/common';
import { ClientModuleModule } from './module/module.module';
import { ClientMenuModule } from './menu/menu.module';
import { ClientUserModule } from './user/user.module';

@Module({
  imports: [ClientModuleModule, ClientMenuModule, ClientUserModule],
  exports: [ClientModuleModule, ClientMenuModule, ClientUserModule],
})
export class ClientModule {}
