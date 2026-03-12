import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 查询角色 DTO
 * 用于分页查询角色列表时的数据传输
 */
export class QueryRoleDto {
  /**
   * 每页数量
   * 范围: 1-100
   * 默认: 10
   */
  @ApiPropertyOptional({ description: '每页数量', example: 10, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: '每页数量最小为1' })
  @Max(100, { message: '每页数量最大为100' })
  pageSize?: number;

  /**
   * 页码
   * 范围: 最小为1
   * 默认: 1
   */
  @ApiPropertyOptional({ description: '页码', example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: '页码最小为1' })
  pageNo?: number;

  /**
   * 角色名称（模糊查询）
   */
  @ApiPropertyOptional({ description: '角色名称（模糊查询）', example: '管理' })
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * 是否启用
   */
  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enable?: boolean;
}
