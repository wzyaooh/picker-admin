import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * 更新账号锁定策略 DTO
 */
export class UpdateAccountLockoutDto {
  @ApiPropertyOptional({ description: '启用账号锁定', example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '最大登录失败次数', minimum: 3, maximum: 10, example: 5 })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  maxAttempts?: number;

  @ApiPropertyOptional({ description: '账号锁定时长（分钟）', minimum: 5, maximum: 1440, example: 30 })
  @IsOptional()
  @IsInt()
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
