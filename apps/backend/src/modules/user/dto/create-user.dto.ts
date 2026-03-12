import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProfileDto } from './profile.dto';

/**
 * 创建用户 DTO
 * 用于创建新用户时的数据传输
 */
export class CreateUserDto {
  /**
   * 用户名
   * 长度: 3-20 字符
   * 唯一性: 是
   */
  @ApiProperty({ 
    description: '用户名', 
    example: 'zhangsan',
    minLength: 3,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名长度不能少于3位' })
  @MaxLength(20, { message: '用户名长度不能超过20位' })
  @Length(3, 20, {
    message: `用户名长度必须大于$constraint1到$constraint2之间，当前传递的值是$value`,
  })
  username: string;

  /**
   * 密码（可选）
   * 不传则使用默认密码 123456
   */
  @ApiPropertyOptional({ 
    description: '密码（可选，不传则使用默认密码 123456）', 
    example: 'Pass123456',
    minLength: 6,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(6, { message: '密码长度不能少于6位' })
  @MaxLength(100, { message: '密码长度不能超过100位' })
  password?: string;

  /**
   * 是否启用
   * 默认: true
   */
  @ApiPropertyOptional({ description: '是否启用', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  enable?: boolean;

  /**
   * 部门ID
   */
  @ApiPropertyOptional({ description: '部门ID', example: 1 })
  @IsNumber()
  @IsOptional()
  departmentId?: number;

  /**
   * 岗位ID
   */
  @ApiPropertyOptional({ description: '岗位ID', example: 1 })
  @IsNumber()
  @IsOptional()
  positionId?: number;

  /**
   * 用户资料
   */
  @ApiPropertyOptional({ description: '用户资料', type: () => ProfileDto })
  @IsOptional()
  profile?: ProfileDto;

  /**
   * 角色ID列表
   */
  @ApiPropertyOptional({ description: '角色ID列表', example: [1, 2], type: [Number] })
  @IsOptional()
  @IsArray()
  roleIds?: number[];
}
