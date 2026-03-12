import { IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 用户登录 DTO
 * 用于用户登录时的数据传输
 */
export class LoginDto {
  /**
   * 用户名
   */
  @ApiProperty({ description: '用户名', example: 'admin' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  /**
   * 密码
   */
  @ApiProperty({ description: '密码', example: '123456' })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;

  /**
   * 验证码
   * 快速登录时可选
   */
  @ApiPropertyOptional({ description: '验证码', example: 'abc123' })
  @ValidateIf((o) => !o.isQuick)
  @IsString()
  @IsOptional()
  captcha?: string | boolean;

  /**
   * 验证码ID
   * 快速登录时可选
   */
  @ApiPropertyOptional({ description: '验证码ID', example: 'uuid-123' })
  @ValidateIf((o) => !o.isQuick)
  @IsString()
  @IsOptional()
  captchaId?: string;

  /**
   * 是否快速登录
   * 快速登录时不需要验证码
   */
  @ApiPropertyOptional({ description: '是否快速登录', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isQuick?: boolean;
}
