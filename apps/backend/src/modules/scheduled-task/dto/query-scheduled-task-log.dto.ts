import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class QueryScheduledTaskLogDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页条数', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;

  @ApiPropertyOptional({ description: '任务名称' })
  @IsOptional()
  @IsString()
  taskName?: string;

  @ApiPropertyOptional({ description: '执行状态（SUCCESS/FAIL/TIMEOUT）' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '开始时间起始范围' })
  @IsOptional()
  @IsString()
  startTimeFrom?: string;

  @ApiPropertyOptional({ description: '开始时间结束范围' })
  @IsOptional()
  @IsString()
  startTimeTo?: string;
}
