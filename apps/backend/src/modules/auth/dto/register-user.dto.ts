import { IsString, Length, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ValidatePassword } from '@/common/validators/password-policy.validator';

/**
 * 用户注册 DTO
 * 用于新用户注册时的数据传输
 */
export class RegisterUserDto {
  /**
   * 用户名
   * 长度: 3-20 字符
   */
  @ApiProperty({ 
    description: '用户名', 
    example: 'newuser',
    minLength: 3,
    maxLength: 20,
  })
  @IsString()
  @MinLength(3, { message: '用户名长度不能少于3位' })
  @MaxLength(20, { message: '用户名长度不能超过20位' })
  @Length(3, 20, {
    message: `用户名长度必须是$constraint1到$constraint2之间，当前传递的值是$value`,
  })
  username: string;

  /**
   * 密码
   * 使用动态密码策略验证
   */
  @ApiProperty({ 
    description: '密码（根据系统配置的密码策略验证）', 
    example: 'Pass123456',
    minLength: 6,
    maxLength: 100,
  })
  @IsString()
  @ValidatePassword()
  password: string;
}
