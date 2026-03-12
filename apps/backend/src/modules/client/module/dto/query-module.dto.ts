import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * 查询模块 DTO
 *
 * 用于分页查询模块列表，支持关键字搜索
 */
export class QueryModuleDto {
  /**
   * 页码
   *
   * @default 1
   * @minimum 1
   */
  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageNo?: number;

  /**
   * 每页数量
   *
   * @default 10
   * @minimum 1
   * @maximum 100
   */
  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number;

  /**
   * 搜索关键词
   *
   * 用于模糊匹配模块名称或编码
   */
  @ApiPropertyOptional({
    description: '搜索关键词（模块名称或编码）',
    example: '系统',
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
