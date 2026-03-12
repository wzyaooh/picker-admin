import { Exclude } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 更新角色 DTO
 * 用于更新角色信息时的数据传输
 */
export class UpdateRoleDto {
  /**
   * 角色编码（排除）
   * 角色编码不能修改
   */
  @Exclude()
  code: string;

  /**
   * 角色名称
   * 长度: 1-50 字符
   */
  @ApiPropertyOptional({ 
    description: '角色名称', 
    example: '管理员',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: '角色名长度不能少于1位' })
  @MaxLength(50, { message: '角色名长度不能超过50位' })
  name?: string;

  /**
   * 角色描述
   * 长度: 最多200字符
   */
  @ApiPropertyOptional({ 
    description: '角色描述', 
    example: '系统管理员角色',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '角色描述长度不能超过200位' })
  description?: string;

  /**
   * 权限ID列表
   */
  @ApiPropertyOptional({ 
    description: '权限ID列表', 
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  permissionIds?: number[];

  /**
   * 是否启用
   */
  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsBoolean()
  @IsOptional()
  enable?: boolean;
}
