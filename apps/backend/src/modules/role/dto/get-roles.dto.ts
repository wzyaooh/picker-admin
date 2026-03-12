import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 获取角色列表 DTO
 * 用于获取所有角色（不分页）时的数据传输
 */
export class GetRolesDto {
  /**
   * 是否启用
   * 不传则返回所有角色
   */
  @ApiPropertyOptional({ description: '是否启用（不传则返回所有角色）', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enable?: boolean;
}
