import { IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 添加用户角色 DTO
 * 用于为用户分配角色时的数据传输
 */
export class AddUserRolesDto {
  /**
   * 角色ID列表
   * 至少包含一个角色ID
   */
  @ApiProperty({ 
    description: '角色ID列表', 
    example: [1, 2],
    type: [Number],
    minItems: 1,
  })
  @IsArray()
  @IsNotEmpty({ message: '角色ID列表不能为空' })
  @ArrayMinSize(1, { message: '至少需要一个角色ID' })
  roleIds: number[];
}
