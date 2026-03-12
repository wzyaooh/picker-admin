import { Exclude } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { ProfileDto } from './profile.dto';

/**
 * 更新用户 DTO
 * 用于更新用户信息时的数据传输
 */
export class UpdateUserDto {
  /**
   * 密码字段（排除）
   * 密码不能通过此接口更新
   */
  @Exclude()
  password: string;

  /**
   * 用户资料（排除）
   * 用户资料通过专门的接口更新
   */
  @Exclude()
  profile?: ProfileDto;

  /**
   * 用户名
   * 长度: 5-20 字符
   */
  @ApiPropertyOptional({ 
    description: '用户名', 
    example: 'zhangsan',
    minLength: 5,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(5, { message: '用户名长度不能少于5位' })
  @MaxLength(20, { message: '用户名长度不能超过20位' })
  @Length(5, 20, {
    message: `用户名长度必须大于$constraint1到$constraint2之间，当前传递的值是$value`,
  })
  @IsOptional()
  username?: string;

  /**
   * 是否启用
   */
  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsBoolean()
  @IsOptional()
  enable?: boolean;

  /**
   * 角色ID列表
   */
  @ApiPropertyOptional({ description: '角色ID列表', example: [1, 2], type: [Number] })
  @IsOptional()
  @IsArray()
  roleIds?: number[];

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
}
