import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

/**
 * 移动文件 DTO
 *
 * 用于将文件或文件夹移动到指定位置
 */
export class MoveFileDto {
  /**
   * 目标文件夹ID
   *
   * 文件将被移动到此文件夹下
   * - null 或不传: 移动到根目录
   * - 数字: 移动到指定文件夹
   */
  @ApiPropertyOptional({
    description: '目标文件夹ID（null表示根目录）',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetFolderId?: number | null;
}
