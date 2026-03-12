import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

/**
 * 添加标签 DTO
 *
 * 用于为文件添加标签，便于分类和检索
 */
export class AddTagsDto {
  /**
   * 标签列表
   *
   * 要添加到文件的标签数组
   *
   * @minItems 1
   */
  @ApiProperty({
    description: '标签列表',
    type: [String],
    example: ['工作', '重要'],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  tags: string[];
}
