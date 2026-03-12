import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * 创建字典 DTO
 * 用于创建新字典时的数据传输
 */
export class CreateDictDto {
  /**
   * 字典编码
   * 长度: 1-50 字符
   * 规则: 只能包含字母、数字和下划线
   * 唯一性: 是
   */
  @ApiProperty({
    description: '字典编码（只能包含字母、数字和下划线）',
    example: 'USER_STATUS',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1, { message: '字典编码长度不能少于1位' })
  @MaxLength(50, { message: '字典编码长度不能超过50位' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'code 只能包含字母、数字和下划线',
  })
  code: string;

  /**
   * 字典名称
   * 长度: 1-50 字符
   */
  @ApiProperty({
    description: '字典名称',
    example: '用户状态',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1, { message: '字典名称长度不能少于1位' })
  @MaxLength(50, { message: '字典名称长度不能超过50位' })
  name: string;

  /**
   * 字典描述
   * 长度: 最多200字符
   */
  @ApiPropertyOptional({
    description: '字典描述',
    example: '用户账号状态',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '字典描述长度不能超过200位' })
  description?: string;

  /**
   * 是否启用
   * 默认: true
   */
  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enable?: boolean;
}
