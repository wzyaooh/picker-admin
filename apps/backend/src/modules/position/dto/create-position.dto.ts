import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 创建岗位 DTO
 * 用于创建新岗位时的数据传输
 */
export class CreatePositionDto {
  /**
   * 岗位编码
   * 长度: 1-50 字符
   * 唯一性: 是
   */
  @ApiProperty({ description: '岗位编码', example: 'POS_001', minLength: 1, maxLength: 50 })
  @IsString()
  @IsNotEmpty({ message: '岗位编码不能为空' })
  @MinLength(1, { message: '岗位编码长度不能少于1位' })
  @MaxLength(50, { message: '岗位编码长度不能超过50位' })
  code: string;

  /**
   * 岗位名称
   * 长度: 1-100 字符
   */
  @ApiProperty({ description: '岗位名称', example: '高级工程师', minLength: 1, maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: '岗位名称不能为空' })
  @MinLength(1, { message: '岗位名称长度不能少于1位' })
  @MaxLength(100, { message: '岗位名称长度不能超过100位' })
  name: string;

  /**
   * 岗位描述
   * 长度: 最多200字符
   */
  @ApiPropertyOptional({ description: '岗位描述', example: '负责核心系统开发', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '岗位描述长度不能超过200位' })
  description?: string;

  /**
   * 排序
   * 默认: 0
   */
  @ApiPropertyOptional({ description: '排序', example: 1, default: 0 })
  @IsNumber()
  @IsOptional()
  sort?: number;

  /**
   * 是否启用
   * 默认: true
   */
  @ApiPropertyOptional({ description: '是否启用', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  enable?: boolean;
}
