import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 查询岗位 DTO
 * 用于分页查询岗位列表时的数据传输
 */
export class QueryPositionDto {
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
   * 岗位名称（模糊查询）
   * 长度: 最多100字符
   */
  @ApiPropertyOptional({ description: '岗位名称（模糊查询）', example: '工程师', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '岗位名称长度不能超过100位' })
  name?: string;

  /**
   * 岗位编码（模糊查询）
   * 长度: 最多50字符
   */
  @ApiPropertyOptional({ description: '岗位编码（模糊查询）', example: 'POS', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '岗位编码长度不能超过50位' })
  code?: string;

  /**
   * 是否启用
   */
  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enable?: boolean;
}
