import { IsNotEmpty, IsString, MinLength, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 更新密码 DTO
 * 用于管理员更新用户密码时的数据传输
 */
export class UpdatePasswordDto {
  /**
   * 新密码
   * 长度: 6-100 字符
   * 规则: 必须包含大小写字母和数字
   */
  @ApiProperty({ 
    description: '新密码（必须包含大小写字母和数字）', 
    example: 'NewPass123',
    minLength: 6,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6位' })
  @MaxLength(100, { message: '密码长度不能超过100位' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/, {
    message: '密码必须包含大小写字母和数字',
  })
  password: string;
}
