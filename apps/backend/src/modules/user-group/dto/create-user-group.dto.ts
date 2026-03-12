import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * 创建用户组 DTO
 *
 * 用于创建新的用户组
 * 用户组用于批量管理用户权限和组织结构
 */
export class CreateUserGroupDto {
  /**
   * 用户组编码
   *
   * 唯一标识用户组的编码，通常使用大写字母和下划线
   *
   * @minLength 1
   * @maxLength 50
   */
  @ApiProperty({
    description: '用户组编码',
    example: 'SALES_TEAM',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  /**
   * 用户组名称
   *
   * 用户组的显示名称
   *
   * @minLength 1
   * @maxLength 50
   */
  @ApiProperty({
    description: '用户组名称',
    example: '销售团队',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  /**
   * 描述
   *
   * 用户组的详细说明
   */
  @ApiPropertyOptional({
    description: '描述',
    example: '负责产品销售的团队',
  })
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * 是否启用
   *
   * 控制用户组是否可用
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

  /**
   * 排序值
   *
   * 用于控制用户组的显示顺序，值越小越靠前
   *
   * @default 0
   * @minimum 0
   */
  @ApiPropertyOptional({
    description: '排序值（越小越靠前）',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sort?: number;
}
