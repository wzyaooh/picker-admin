import { IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 添加角色用户 DTO
 * 用于为角色分配用户时的数据传输
 */
export class AddRoleUsersDto {
  /**
   * 用户ID列表
   * 至少包含一个用户ID
   */
  @ApiProperty({ 
    description: '用户ID列表', 
    example: [1, 2, 3],
    type: [Number],
    minItems: 1,
  })
  @IsArray()
  @IsNotEmpty({ message: '用户ID列表不能为空' })
  @ArrayMinSize(1, { message: '至少需要一个用户ID' })
  userIds: number[];
}
