import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 修改密码 DTO
 * 用于用户修改密码时的数据传输
 */
export class ChangePasswordDto {
  /**
   * 旧密码
   */
  @ApiProperty({ description: '旧密码', example: 'OldPass123' })
  @IsString()
  @IsNotEmpty({ message: '旧密码不能为空' })
  oldPassword: string;

  /**
   * 新密码
   * 使用动态密码策略验证
   */
  @ApiProperty({ 
    description: '新密码（根据系统配置的密码策略验证）', 
    example: 'NewPass123',
    minLength: 6,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  newPassword: string;
}
