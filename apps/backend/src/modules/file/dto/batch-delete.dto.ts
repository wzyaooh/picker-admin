import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNumber } from 'class-validator';

/**
 * 批量删除文件 DTO
 *
 * 用于一次性删除多个文件或文件夹
 */
export class BatchDeleteDto {
  /**
   * 文件ID列表
   *
   * 要删除的文件或文件夹ID数组
   *
   * @minItems 1
   */
  @ApiProperty({
    description: '文件ID列表',
    type: [Number],
    example: [1, 2, 3],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  fileIds: number[];
}
