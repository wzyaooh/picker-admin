import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNumber } from 'class-validator';

/**
 * 设置用户组权限 DTO
 *
 * 用于批量设置用户组的权限
 * 会覆盖用户组原有的所有权限
 */
export class SetPermissionsDto {
  /**
   * 权限ID列表
   *
   * 要分配给用户组的权限ID数组
   *
   * @minItems 1
   */
  @ApiProperty({
    description: '权限ID列表',
    example: [1, 2, 3],
    type: [Number],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  permissionIds: number[];
}
