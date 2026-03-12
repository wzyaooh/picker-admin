import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 查询部门 DTO
 * 用于查询部门列表时的数据传输
 */
export class QueryDepartmentDto {
  /**
   * 部门名称关键字
   * 模糊查询
   * 长度: 最多100字符
   */
  @ApiPropertyOptional({ description: '部门名称关键字', example: '技术', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '部门名称关键字长度不能超过100位' })
  name?: string;

  /**
   * 是否启用
   */
  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  enable?: boolean;
}
