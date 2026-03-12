import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';
import { PermissionModule } from './modules/permission/permission.module';
import { RoleModule } from './modules/role/role.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { DepartmentModule } from './modules/department/department.module';
import { PositionModule } from './modules/position/position.module';
import { UserGroupModule } from './modules/user-group/user-group.module';
import { DictModule } from './modules/dict/dict.module';
import { ClientModule } from './modules/client/client.module';
import { FileModule } from './modules/file/file.module';
import { SecurityConfigModule } from './modules/security-config/security-config.module';
import { PasswordHistoryModule } from './modules/password-history/password-history.module';
import { CleanupModule } from './modules/cleanup/cleanup.module';
import { ScheduledTaskModule } from './modules/scheduled-task/scheduled-task.module';
import { SmsConfigModule } from './modules/sms-config/sms-config.module';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    /* 配置文件模块 */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    /* 请求限流模块 */
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 时间窗口：60秒
        limit: 1000, // 限制：每个时间窗口最多1000个请求（增加限制）
      },
    ]),

    /* 定时任务模块 */
    ScheduleModule.forRoot(),

    HealthModule,

    UserModule,
    PermissionModule,
    RoleModule,
    AuthModule,
    DepartmentModule,
    PositionModule,
    UserGroupModule,
    DictModule,
    ClientModule,
    FileModule,

    AuditModule,
    SecurityConfigModule,
    SmsConfigModule,
    PasswordHistoryModule,
    CleanupModule,
    ScheduledTaskModule,
    ApiKeyModule,

    SharedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
