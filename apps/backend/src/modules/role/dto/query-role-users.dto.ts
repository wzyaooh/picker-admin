import { IsNumber, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 查询角色用户 DTO
 * 用于分页查询角色下的用户列表时的数据传输
 */
export class QueryRoleUsersDto {
  /**
   * 页码
   * 范围: 最小为1
   * 默认: 1
   */
  @ApiPropertyOptional({ description: '页码', example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: '页码最小为1' })
  @Type(() => Number)
  pageNo?: number = 1;

  /**
   * 每页数量
   * 范围: 1-100
   * 默认: 10
   */
  @ApiPropertyOptional({ description: '每页数量', example: 10, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: '每页数量最小为1' })
  @Max(100, { message: '每页数量最大为100' })
  @Type(() => Number)
  pageSize?: number = 10;

  /**
   * 用户名（模糊查询）
   * 长度: 最多50字符
   */
  @ApiPropertyOptional({ description: '用户名（模糊查询）', example: 'zhang', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '用户名长度不能超过50位' })
  username?: string;

  /**
   * 真实姓名（模糊查询）
   * 长度: 最多50字符
   */
  @ApiPropertyOptional({ description: '真实姓名（模糊查询）', example: '张三', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '真实姓名长度不能超过50位' })
  realName?: string;
}
