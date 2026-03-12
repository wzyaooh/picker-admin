import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSmsConfigDto {
  @ApiProperty({ description: '配置名称', example: '阿里云短信', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '短信厂商', example: 'aliyun' })
  @IsString()
  @MaxLength(50)
  provider: string;

  @ApiProperty({ description: 'Access Key', example: 'LTAI5t...' })
  @IsString()
  @MaxLength(200)
  accessKey: string;

  @ApiProperty({ description: 'Secret Key', example: 'xxx' })
  @IsString()
  @MaxLength(200)
  secretKey: string;

  @ApiProperty({ description: '短信签名', example: '我的应用' })
  @IsString()
  @MaxLength(100)
  signName: string;

  @ApiProperty({ description: '模板ID', example: 'SMS_123456' })
  @IsString()
  @MaxLength(200)
  templateId: string;

  @ApiPropertyOptional({ description: '是否为默认配置', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '负载均衡配置（JSON字符串）' })
  @IsOptional()
  @IsString()
  loadBalanceConfig?: string;

  @ApiPropertyOptional({ description: '重试间隔（秒）', default: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  retryInterval?: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
