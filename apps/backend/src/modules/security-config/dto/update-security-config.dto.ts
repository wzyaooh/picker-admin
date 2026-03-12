import { IsOptional, IsNumber, IsBoolean, IsString, IsArray, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 密码策略配置 DTO
 */
export class PasswordPolicyDto {
  @ApiPropertyOptional({ description: '最小长度', example: 8, minimum: 6, maximum: 32 })
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(32)
  minLength?: number;

  @ApiPropertyOptional({ description: '最大长度', example: 32, minimum: 8, maximum: 128 })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(128)
  maxLength?: number;

  @ApiPropertyOptional({ description: '是否要求大写字母', example: true })
  @IsOptional()
  @IsBoolean()
  requireUppercase?: boolean;

  @ApiPropertyOptional({ description: '是否要求小写字母', example: true })
  @IsOptional()
  @IsBoolean()
  requireLowercase?: boolean;

  @ApiPropertyOptional({ description: '是否要求数字', example: true })
  @IsOptional()
  @IsBoolean()
  requireNumber?: boolean;

  @ApiPropertyOptional({ description: '是否要求特殊字符', example: true })
  @IsOptional()
  @IsBoolean()
  requireSpecial?: boolean;

  @ApiPropertyOptional({ description: '特殊字符集', example: '!@#$%^&*' })
  @IsOptional()
  @IsString()
  specialChars?: string;

  @ApiPropertyOptional({ description: '启用密码过期', example: false })
  @IsOptional()
  @IsBoolean()
  expiryEnabled?: boolean;

  @ApiPropertyOptional({ description: '密码有效天数（0表示不过期）', example: 90, minimum: 0, maximum: 365 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  expiryDays?: number;

  @ApiPropertyOptional({ description: '过期前提醒天数', example: 7, minimum: 0, maximum: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  expiryWarningDays?: number;

  @ApiPropertyOptional({ description: '启用历史密码检查', example: true })
  @IsOptional()
  @IsBoolean()
  historyEnabled?: boolean;

  @ApiPropertyOptional({ description: '历史密码限制次数（0表示不限制）', example: 5, minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  historyCount?: number;
}

/**
 * 账号锁定策略配置 DTO
 */
export class AccountLockoutDto {
  @ApiPropertyOptional({ description: '是否启用账号锁定', example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '最大失败次数', example: 5, minimum: 3, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(10)
  maxAttempts?: number;

  @ApiPropertyOptional({ description: '锁定时长（分钟）', example: 30, minimum: 5, maximum: 1440 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  lockoutDuration?: number;

  @ApiPropertyOptional({ description: 'Redis 键前缀', example: 'login_fail:' })
  @IsOptional()
  @IsString()
  redisKeyPrefix?: string;

  @ApiPropertyOptional({ description: '是否持久化到数据库', example: false })
  @IsOptional()
  @IsBoolean()
  persistToDb?: boolean;
}

/**
 * 审计日志配置 DTO
 */
export class AuditPolicyDto {
  @ApiPropertyOptional({ description: '启用审计日志', example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '记录请求体', example: false })
  @IsOptional()
  @IsBoolean()
  saveReqBody?: boolean;

  @ApiPropertyOptional({ description: '记录响应体', example: false })
  @IsOptional()
  @IsBoolean()
  saveResBody?: boolean;

  @ApiPropertyOptional({ description: '忽略路径列表', example: ['/health', '/metrics'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ignorePaths?: string[];

  @ApiPropertyOptional({ description: '启用敏感信息脱敏', example: true })
  @IsOptional()
  @IsBoolean()
  maskingEnabled?: boolean;

  @ApiPropertyOptional({ description: '敏感字段列表', example: ['password', 'token'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sensitiveFields?: string[];

  @ApiPropertyOptional({ description: '日志保留天数', example: 90, minimum: 7, maximum: 365 })
  @IsOptional()
  @IsNumber()
  @Min(7)
  @Max(365)
  retentionDays?: number;

  @ApiPropertyOptional({ description: '自动清理', example: true })
  @IsOptional()
  @IsBoolean()
  autoCleanup?: boolean;
}

/**
 * 更新邮件配置 DTO
 */
export class UpdateEmailConfigDto {
  @ApiPropertyOptional({ description: '邮件协议', example: 'SMTP' })
  @IsOptional()
  @IsString()
  protocol?: string;

  @ApiPropertyOptional({ description: '服务器地址', example: 'smtp.126.com' })
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional({ description: '服务器端口', example: 465 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ description: '邮箱账号', example: 'user@example.com' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: '邮箱密码/授权码' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: '启用SSL加密', example: true })
  @IsOptional()
  @IsBoolean()
  useSsl?: boolean;

  @ApiPropertyOptional({ description: 'SSL端口号', example: 465 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  sslPort?: number;
}

/**
 * 更新安全配置 DTO
 */
export class UpdateSecurityConfigDto {
  @ApiPropertyOptional({ description: '密码策略配置', type: PasswordPolicyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PasswordPolicyDto)
  passwordPolicy?: PasswordPolicyDto;

  @ApiPropertyOptional({ description: '账号锁定策略配置', type: AccountLockoutDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountLockoutDto)
  accountLockout?: AccountLockoutDto;

  @ApiPropertyOptional({ description: '审计日志配置', type: AuditPolicyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuditPolicyDto)
  auditPolicy?: AuditPolicyDto;
}
