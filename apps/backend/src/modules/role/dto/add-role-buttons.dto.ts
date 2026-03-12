import { IsArray, IsNotEmpty, IsNumber, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 添加角色按钮权限 DTO
 * 用于为角色分配按钮权限时的数据传输
 */
export class AddRoleButtonsDto {
  /**
   * 角色ID
   */
  @ApiProperty({ description: '角色ID', example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: number;

  /**
   * 菜单ID
   */
  @ApiProperty({ description: '菜单ID', example: 10 })
  @IsNumber()
  @IsNotEmpty({ message: '菜单ID不能为空' })
  menuId: number;

  /**
   * 按钮权限编码列表
   * 至少包含一个按钮编码
   */
  @ApiProperty({ 
    description: '按钮权限编码列表', 
    example: ['create', 'edit', 'delete'],
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @IsNotEmpty({ message: '按钮权限编码列表不能为空' })
  @ArrayMinSize(1, { message: '至少需要一个按钮权限编码' })
  buttons: string[];
}
