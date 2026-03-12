import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 查询审计日志 DTO
 */
export class QueryAuditDto {
  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: '用户名（模糊查询）' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: '操作类型' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'HTTP方法' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: '请求路径（模糊查询）' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '执行状态（1:成功, 0:失败）', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  success?: number;
}
