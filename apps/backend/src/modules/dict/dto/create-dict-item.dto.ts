import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * 创建字典项 DTO
 *
 * 用于创建字典项（字典的具体选项值）
 * 字典项包含标签（显示文本）和值（实际值）
 */
export class CreateDictItemDto {
  /**
   * 字典项标签
   *
   * 显示给用户看的文本，如"活跃"、"禁用"
   *
   * @minLength 1
   * @maxLength 100
   */
  @ApiProperty({
    description: '字典项标签（显示文本）',
    example: '活跃',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  /**
   * 字典项值
   *
   * 实际存储和使用的值，如"ACTIVE"、"DISABLED"
   *
   * @minLength 1
   * @maxLength 100
   */
  @ApiProperty({
    description: '字典项值（实际值）',
    example: 'ACTIVE',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  value: string;

  /**
   * 颜色标签
   *
   * 用于前端显示的颜色标识，如"success"、"error"、"warning"
   *
   * @maxLength 20
   */
  @ApiPropertyOptional({
    description: '颜色标签（用于前端显示）',
    example: 'success',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  /**
   * 描述
   *
   * 字典项的详细说明
   */
  @ApiPropertyOptional({
    description: '描述',
    example: '用户账号处于活跃状态',
  })
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * 排序值
   *
   * 用于控制字典项的显示顺序，值越小越靠前
   *
   * @default 0
   * @minimum 0
   */
  @ApiPropertyOptional({
    description: '排序值（越小越靠前）',
    example: 1,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sort?: number;

  /**
   * 是否启用
   *
   * 控制字典项是否可用
   *
   * @default true
   */
  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enable?: boolean;
}
