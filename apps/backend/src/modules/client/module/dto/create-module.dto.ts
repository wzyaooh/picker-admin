import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * 创建模块 DTO
 *
 * 用于创建新的客户端模块
 * 模块是菜单系统的顶层节点，用于组织和分类功能
 */
export class CreateModuleDto {
  /**
   * 模块名称
   *
   * 模块的显示名称
   *
   * @minLength 1
   * @maxLength 50
   */
  @ApiProperty({
    description: '模块名称',
    example: '系统管理',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  /**
   * 模块编码
   *
   * 唯一标识模块的编码
   * 只能包含大写字母和下划线
   *
   * @minLength 1
   * @maxLength 50
   */
  @ApiProperty({
    description: '模块编码（只能包含大写字母和下划线）',
    example: 'SYSTEM_MANAGEMENT',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[A-Z_]+$/, { message: '模块编码只能包含大写字母和下划线' })
  code: string;

  /**
   * 模块描述
   *
   * 模块的详细说明
   */
  @ApiPropertyOptional({
    description: '模块描述',
    example: '系统管理模块，包含用户、角色、权限等功能',
  })
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * 是否启用
   *
   * 控制模块是否可用
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
