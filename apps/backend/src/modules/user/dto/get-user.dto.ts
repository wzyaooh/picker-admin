import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 查询用户 DTO
 * 用于查询用户列表时的数据传输
 */
export class GetUserDto {
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
   * 用户名（模糊查询）
   */
  @ApiPropertyOptional({ description: '用户名（模糊查询）', example: 'zhang' })
  @IsOptional()
  @IsString()
  username?: string;

  /**
   * 性别
   * 0: 未知, 1: 男, 2: 女
   */
  @ApiPropertyOptional({ description: '性别（0:未知 1:男 2:女）', example: 1, enum: [0, 1, 2] })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gender?: number;

  /**
   * 角色ID
   */
  @ApiPropertyOptional({ description: '角色ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  role?: number;

  /**
   * 是否启用
   */
  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enable?: boolean;

  /**
   * 部门ID
   */
  @ApiPropertyOptional({ description: '部门ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  departmentId?: number;

  /**
   * 岗位ID
   */
  @ApiPropertyOptional({ description: '岗位ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  positionId?: number;
}
