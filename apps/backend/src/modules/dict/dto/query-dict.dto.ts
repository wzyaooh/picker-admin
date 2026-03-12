import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * 查询字典 DTO
 *
 * 用于分页查询字典列表，支持关键字搜索和启用状态过滤
 */
export class QueryDictDto {
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
  pageNo?: number = 1;

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
  pageSize?: number = 10;

  /**
   * 搜索关键字
   *
   * 用于模糊匹配字典名称或编码
   */
  @ApiPropertyOptional({
    description: '搜索关键字（匹配字典名称或编码）',
    example: '状态',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  /**
   * 是否启用
   *
   * - true: 仅查询启用的字典
   * - false: 仅查询禁用的字典
   * - 不传: 查询全部字典
   */
  @ApiPropertyOptional({
    description: '是否启用（true: 仅启用, false: 仅禁用, 不传: 全部）',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enable?: boolean;
}
