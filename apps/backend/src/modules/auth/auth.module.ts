import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy, JwtStrategy } from './strategies';
import { SecurityConfigModule } from '@/modules/security-config/security-config.module';
import { PasswordHistoryModule } from '@/modules/password-history/password-history.module';
import { PasswordPolicyValidator } from '@/common/validators/password-policy.validator';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          secret: process.env.JWT_SECRET || configService.get('JWT_SECRET'),
        };
      },
    }),
    SecurityConfigModule,
    PasswordHistoryModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, PasswordPolicyValidator],
})
export class AuthModule {}
