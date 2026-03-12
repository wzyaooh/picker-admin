import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNumber } from 'class-validator';

/**
 * 添加用户组成员 DTO
 *
 * 用于向用户组批量添加用户成员
 */
export class AddMembersDto {
  /**
   * 用户ID列表
   *
   * 要添加到用户组的用户ID数组
   *
   * @minItems 1
   */
  @ApiProperty({
    description: '用户ID列表',
    example: [1, 2, 3],
    type: [Number],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  userIds: number[];
}
