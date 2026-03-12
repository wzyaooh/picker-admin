import { IsEmail, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 用户资料 DTO
 * 用于用户资料信息的数据传输
 */
export class ProfileDto {
  /**
   * 昵称
   * 长度: 最多50字符
   */
  @ApiPropertyOptional({ description: '昵称', example: '张三', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '昵称长度不能超过50位' })
  nickName: string;

  /**
   * 性别
   * 0: 未知, 1: 男, 2: 女
   */
  @ApiPropertyOptional({ description: '性别（0:未知 1:男 2:女）', example: 1, enum: [0, 1, 2] })
  @IsOptional()
  @IsNumber()
  gender: number;

  /**
   * 头像URL
   * 长度: 最多500字符
   */
  @ApiPropertyOptional({ description: '头像URL', example: 'https://example.com/avatar.jpg', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '头像URL长度不能超过500位' })
  avatar: string;

  /**
   * 地址
   * 长度: 最多200字符
   */
  @ApiPropertyOptional({ description: '地址', example: '北京市朝阳区', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '地址长度不能超过200位' })
  address: string;

  /**
   * 邮箱
   * 长度: 最多100字符
   */
  @ApiPropertyOptional({ description: '邮箱', example: 'user@example.com', maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(100, { message: '邮箱长度不能超过100位' })
  email: string;
}
