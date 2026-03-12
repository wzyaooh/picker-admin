import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * 文件类别
 */
export enum FileCategory {
  ALL = 'all',
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  OTHER = 'other',
}

/**
 * 排序字段
 */
export enum SortBy {
  NAME = 'name',
  SIZE = 'size',
  DATE = 'date',
  TYPE = 'type',
}

/**
 * 排序顺序
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * 查询文件列表 DTO
 */
export class QueryFileDto {
  /**
   * 文件夹ID
   *
   * 指定查询哪个文件夹下的文件
   */
  @ApiPropertyOptional({
    description: '文件夹ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  folderId?: number;

  /**
   * 存储配置ID
   *
   * 指定查询哪个存储配置下的文件
   */
  @ApiPropertyOptional({
    description: '存储配置ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  storageConfigId?: number;

  /**
   * 文件类别
   *
   * 按文件类型筛选
   */
  @ApiPropertyOptional({
    description: '文件类别',
    enum: FileCategory,
    example: FileCategory.IMAGE,
  })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  /**
   * 搜索关键词
   *
   * 用于模糊匹配文件名
   */
  @ApiPropertyOptional({
    description: '搜索关键词',
    example: 'document',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  /**
   * 排序字段
   */
  @ApiPropertyOptional({
    description: '排序字段',
    enum: SortBy,
    example: SortBy.DATE,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  /**
   * 排序顺序
   */
  @ApiPropertyOptional({
    description: '排序顺序',
    enum: SortOrder,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

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
  page?: number = 1;

  /**
   * 每页数量
   *
   * @default 30
   * @minimum 1
   */
  @ApiPropertyOptional({
    description: '每页数量',
    example: 30,
    minimum: 1,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 30;
}
