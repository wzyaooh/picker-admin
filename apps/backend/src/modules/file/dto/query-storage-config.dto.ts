import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

/**
 * 查询存储配置 DTO
 *
 * 用于分页查询存储配置列表，支持类型、关键字和启用状态过滤
 */
export class QueryStorageConfigDto {
  /**
   * 存储类型
   *
   * - local: 本地存储
   * - object: 对象存储（如 MinIO、S3）
   */
  @ApiPropertyOptional({
    description: '存储类型',
    enum: ['local', 'object'],
    example: 'local',
  })
  @IsOptional()
  @IsString()
  @IsIn(['local', 'object'])
  type?: string;

  /**
   * 关键词搜索
   *
   * 用于模糊匹配存储配置名称
   */
  @ApiPropertyOptional({
    description: '关键词搜索（名称）',
    example: '开发',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  /**
   * 是否启用
   *
   * - true: 仅查询启用的配置
   * - false: 仅查询禁用的配置
   * - 不传: 查询全部配置
   */
  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;

  /**
   * 页码
   *
   * @default 1
   */
  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  /**
   * 每页数量
   *
   * @default 20
   */
  @ApiPropertyOptional({
    description: '每页数量',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number;
}
