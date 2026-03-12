import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * 更新审计策略 DTO
 */
export class UpdateAuditPolicyDto {
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

  @ApiPropertyOptional({ description: '忽略路径列表', type: [String], example: ['/health', '/metrics'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ignorePaths?: string[];

  @ApiPropertyOptional({ description: '启用敏感信息脱敏', example: true })
  @IsOptional()
  @IsBoolean()
  maskingEnabled?: boolean;

  @ApiPropertyOptional({
    description: '敏感字段列表',
    type: [String],
    example: ['password', 'token', 'secret'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sensitiveFields?: string[];

  @ApiPropertyOptional({ description: '日志保留天数', minimum: 7, maximum: 365, example: 90 })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(365)
  retentionDays?: number;

  @ApiPropertyOptional({ description: '自动清理', example: true })
  @IsOptional()
  @IsBoolean()
  autoCleanup?: boolean;
}
