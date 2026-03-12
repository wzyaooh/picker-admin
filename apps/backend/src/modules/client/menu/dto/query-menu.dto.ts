import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * 查询菜单 DTO
 *
 * 用于查询菜单列表，支持模块编码和关键字过滤
 */
export class QueryMenuDto {
  /**
   * 模块编码
   *
   * 用于过滤特定模块的菜单
   */
  @ApiPropertyOptional({
    description: '模块编码（用于过滤特定模块的菜单）',
    example: 'SYSTEM_MANAGEMENT',
  })
  @IsOptional()
  @IsString()
  moduleCode?: string;

  /**
   * 搜索关键词
   *
   * 用于模糊匹配菜单名称
   */
  @ApiPropertyOptional({
    description: '搜索关键词（菜单名称）',
    example: '用户',
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
