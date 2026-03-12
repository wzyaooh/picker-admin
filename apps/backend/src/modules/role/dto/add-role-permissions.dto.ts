import { IsArray, IsNotEmpty, IsNumber, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 添加角色权限 DTO
 * 用于为角色分配权限时的数据传输
 */
export class AddRolePermissionsDto {
  /**
   * 角色ID
   */
  @ApiProperty({ description: '角色ID', example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: number;

  /**
   * 权限ID列表
   * 至少包含一个权限ID
   */
  @ApiProperty({ 
    description: '权限ID列表', 
    example: [1, 2, 3],
    type: [Number],
    minItems: 1,
  })
  @IsArray()
  @IsNotEmpty({ message: '权限ID列表不能为空' })
  @ArrayMinSize(1, { message: '至少需要一个权限ID' })
  permissionIds: number[];
}
