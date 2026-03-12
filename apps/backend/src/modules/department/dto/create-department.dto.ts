import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * 创建部门 DTO
 * 用于创建新部门时的数据传输
 */
export class CreateDepartmentDto {
  /**
   * 部门编码
   * 长度: 1-50 字符
   * 唯一性: 是
   */
  @ApiProperty({ description: '部门编码', example: 'DEPT_001', minLength: 1, maxLength: 50 })
  @IsString()
  @IsNotEmpty({ message: '部门编码不能为空' })
  @MinLength(1, { message: '部门编码长度不能少于1位' })
  @MaxLength(50, { message: '部门编码长度不能超过50位' })
  code: string;

  /**
   * 部门名称
   * 长度: 1-100 字符
   */
  @ApiProperty({ description: '部门名称', example: '技术部', minLength: 1, maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: '部门名称不能为空' })
  @MinLength(1, { message: '部门名称长度不能少于1位' })
  @MaxLength(100, { message: '部门名称长度不能超过100位' })
  name: string;

  /**
   * 部门描述
   * 长度: 最多200字符
   */
  @ApiPropertyOptional({ description: '部门描述', example: '负责技术研发工作', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '部门描述长度不能超过200位' })
  description?: string;

  /**
   * 父部门ID
   * 顶级部门为 null
   */
  @ApiPropertyOptional({ description: '父部门ID', example: 1 })
  @IsNumber()
  @IsOptional()
  parentId?: number;

  /**
   * 部门负责人用户ID
   */
  @ApiPropertyOptional({ description: '部门负责人用户ID', example: 1 })
  @IsNumber()
  @IsOptional()
  leaderId?: number;

  /**
   * 排序
   * 默认: 0
   */
  @ApiPropertyOptional({ description: '排序', default: 0, example: 1 })
  @IsNumber()
  @IsOptional()
  order?: number;

  /**
   * 是否启用
   * 默认: true
   */
  @ApiPropertyOptional({ description: '是否启用', default: true, example: true })
  @IsBoolean()
  @IsOptional()
  enable?: boolean;
}
