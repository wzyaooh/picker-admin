import { IsString, IsArray, IsNumber, IsOptional, IsDateString, MinLength, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'API Key 名称', example: '爬虫服务密钥' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ description: '描述信息' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ 
    description: '权限范围', 
    example: ['crawler:read', 'crawler:write', 'crawler:execute'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiPropertyOptional({ description: '每小时请求限制，0表示无限制', example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  rateLimit?: number;

  @ApiPropertyOptional({ description: '过期时间' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}