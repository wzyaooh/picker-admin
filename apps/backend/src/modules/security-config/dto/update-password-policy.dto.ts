import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * 更新密码策略 DTO
 */
export class UpdatePasswordPolicyDto {
  @ApiPropertyOptional({ description: '密码最小长度', minimum: 6, maximum: 32, example: 8 })
  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(32)
  minLength?: number;

  @ApiPropertyOptional({ description: '密码最大长度', minimum: 8, maximum: 128, example: 32 })
  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(128)
  maxLength?: number;

  @ApiPropertyOptional({ description: '必须包含大写字母', example: true })
  @IsOptional()
  @IsBoolean()
  requireUppercase?: boolean;

  @ApiPropertyOptional({ description: '必须包含小写字母', example: true })
  @IsOptional()
  @IsBoolean()
  requireLowercase?: boolean;

  @ApiPropertyOptional({ description: '必须包含数字', example: true })
  @IsOptional()
  @IsBoolean()
  requireNumber?: boolean;

  @ApiPropertyOptional({ description: '必须包含特殊字符', example: false })
  @IsOptional()
  @IsBoolean()
  requireSpecial?: boolean;

  @ApiPropertyOptional({ description: '特殊字符范围', example: '!@#$%^&*()_+-=[]{}|;:,.<>?' })
  @IsOptional()
  @IsString()
  specialChars?: string;

  @ApiPropertyOptional({ description: '启用密码过期', example: false })
  @IsOptional()
  @IsBoolean()
  expiryEnabled?: boolean;

  @ApiPropertyOptional({ description: '密码有效天数', minimum: 0, maximum: 365, example: 90 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  expiryDays?: number;

  @ApiPropertyOptional({ description: '过期前提醒天数', minimum: 0, maximum: 30, example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  expiryWarningDays?: number;

  @ApiPropertyOptional({ description: '启用历史密码检查', example: true })
  @IsOptional()
  @IsBoolean()
  historyEnabled?: boolean;

  @ApiPropertyOptional({ description: '历史密码记录数', minimum: 0, maximum: 10, example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  historyCount?: number;
}
