import { ApiProperty } from '@nestjs/swagger';
import type {
  AccountLockoutConfig,
  AuditConfig,
  PasswordPolicyConfig,
} from '../interfaces/security-config.interface';

/**
 * 密码策略响应 DTO
 */
export class PasswordPolicyResponseDto implements PasswordPolicyConfig {
  @ApiProperty({ description: '密码最小长度', example: 8 })
  minLength: number;

  @ApiProperty({ description: '密码最大长度', example: 32 })
  maxLength: number;

  @ApiProperty({ description: '必须包含大写字母', example: true })
  requireUppercase: boolean;

  @ApiProperty({ description: '必须包含小写字母', example: true })
  requireLowercase: boolean;

  @ApiProperty({ description: '必须包含数字', example: true })
  requireNumber: boolean;

  @ApiProperty({ description: '必须包含特殊字符', example: false })
  requireSpecial: boolean;

  @ApiProperty({ description: '特殊字符范围', example: '!@#$%^&*()_+-=[]{}|;:,.<>?' })
  specialChars: string;

  @ApiProperty({ description: '启用密码过期', example: false })
  expiryEnabled: boolean;

  @ApiProperty({ description: '密码有效天数', example: 90 })
  expiryDays: number;

  @ApiProperty({ description: '过期前提醒天数', example: 7 })
  expiryWarningDays: number;

  @ApiProperty({ description: '启用历史密码检查', example: true })
  historyEnabled: boolean;

  @ApiProperty({ description: '历史密码记录数', example: 3 })
  historyCount: number;

  @ApiProperty({ description: '记住密码次数', example: 3 })
  rememberPasswordCount: number;
}

/**
 * 账号锁定策略响应 DTO
 */
export class AccountLockoutResponseDto implements AccountLockoutConfig {
  @ApiProperty({ description: '启用账号锁定', example: true })
  enabled: boolean;

  @ApiProperty({ description: '最大登录失败次数', example: 5 })
  maxAttempts: number;

  @ApiProperty({ description: '账号锁定时长（分钟）', example: 30 })
  lockoutDuration: number;

  @ApiProperty({ description: 'Redis 键前缀', example: 'login_fail:' })
  redisKeyPrefix: string;

  @ApiProperty({ description: '是否持久化到数据库', example: false })
  persistToDb: boolean;
}

/**
 * 审计策略响应 DTO
 */
export class AuditPolicyResponseDto implements AuditConfig {
  @ApiProperty({ description: '启用审计日志', example: true })
  enabled: boolean;

  @ApiProperty({ description: '记录请求体', example: false })
  saveReqBody: boolean;

  @ApiProperty({ description: '记录响应体', example: false })
  saveResBody: boolean;

  @ApiProperty({ description: '忽略路径列表', type: [String], example: ['/health', '/metrics'] })
  ignorePaths: string[];

  @ApiProperty({ description: '启用敏感信息脱敏', example: true })
  maskingEnabled: boolean;

  @ApiProperty({
    description: '敏感字段列表',
    type: [String],
    example: ['password', 'token', 'secret'],
  })
  sensitiveFields: string[];

  @ApiProperty({ description: '日志保留天数', example: 90 })
  retentionDays: number;

  @ApiProperty({ description: '自动清理', example: true })
  autoCleanup: boolean;
}

/**
 * 安全配置响应 DTO
 */
export class SecurityConfigResponseDto {
  @ApiProperty({ description: '密码策略配置', type: PasswordPolicyResponseDto })
  passwordPolicy: PasswordPolicyResponseDto;

  @ApiProperty({ description: '账号锁定策略配置', type: AccountLockoutResponseDto })
  accountLockout: AccountLockoutResponseDto;

  @ApiProperty({ description: '审计策略配置', type: AuditPolicyResponseDto })
  auditPolicy: AuditPolicyResponseDto;
}
