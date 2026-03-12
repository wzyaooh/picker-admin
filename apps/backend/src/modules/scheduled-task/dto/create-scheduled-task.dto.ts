import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateScheduledTaskDto {
  @ApiProperty({ description: '任务名称', example: '数据清理任务' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @ApiProperty({ description: '任务组', example: 'system' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  taskGroup: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ description: '触发类型', enum: ['CRON', 'INTERVAL'], example: 'CRON' })
  @IsEnum(['CRON', 'INTERVAL'])
  triggerType: 'CRON' | 'INTERVAL';

  @ApiPropertyOptional({ description: 'Cron 表达式（triggerType=CRON 时必填）', example: '0 0 2 * * *' })
  @ValidateIf((o) => o.triggerType === 'CRON')
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  cronExpression?: string;

  @ApiPropertyOptional({ description: '间隔秒数（triggerType=INTERVAL 时必填）', example: 3600 })
  @ValidateIf((o) => o.triggerType === 'INTERVAL')
  @IsNumber()
  @Min(1)
  intervalSeconds?: number;

  @ApiProperty({ description: '任务类型', enum: ['LOCAL', 'HTTP'], example: 'LOCAL' })
  @IsEnum(['LOCAL', 'HTTP'])
  taskType: 'LOCAL' | 'HTTP';

  @ApiProperty({ description: '执行器名称（LOCAL 时为 handler 名称，HTTP 时为 URL）', example: 'cleanup-scheduler' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  handlerName: string;

  @ApiPropertyOptional({ description: '任务参数（JSON 格式）' })
  @IsOptional()
  @IsString()
  taskParams?: string;

  @ApiPropertyOptional({ description: 'HTTP 请求方法（taskType=HTTP 时有效）', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' })
  @ValidateIf((o) => o.taskType === 'HTTP')
  @IsOptional()
  @IsEnum(['GET', 'POST', 'PUT', 'DELETE'])
  httpMethod?: 'DELETE' | 'GET' | 'POST' | 'PUT';

  @ApiPropertyOptional({ description: 'HTTP 自定义请求头（JSON 格式）' })
  @ValidateIf((o) => o.taskType === 'HTTP')
  @IsOptional()
  @IsString()
  httpHeaders?: string;

  @ApiPropertyOptional({ description: 'HTTP 认证类型', enum: ['NONE', 'BEARER', 'BASIC', 'API_KEY'], default: 'NONE' })
  @ValidateIf((o) => o.taskType === 'HTTP')
  @IsOptional()
  @IsEnum(['NONE', 'BEARER', 'BASIC', 'API_KEY'])
  httpAuthType?: 'API_KEY' | 'BASIC' | 'BEARER' | 'NONE';

  @ApiPropertyOptional({ description: 'HTTP 认证值（Bearer Token / Basic base64 / API Key）' })
  @ValidateIf((o) => o.taskType === 'HTTP')
  @IsOptional()
  @IsString()
  @MaxLength(500)
  httpAuthValue?: string;

  @ApiPropertyOptional({ description: '阻塞策略', enum: ['DISCARD', 'COVER', 'QUEUE'], default: 'DISCARD' })
  @IsOptional()
  @IsEnum(['DISCARD', 'COVER', 'QUEUE'])
  blockingStrategy?: 'COVER' | 'DISCARD' | 'QUEUE';

  @ApiPropertyOptional({ description: '超时时间（秒），0 表示不限制', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeoutSeconds?: number;

  @ApiPropertyOptional({ description: '最大重试次数', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRetryCount?: number;

  @ApiPropertyOptional({ description: '重试间隔（秒）', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retryInterval?: number;

  @ApiPropertyOptional({ description: '是否启用（0-停用 1-启用）', default: 0 })
  @IsOptional()
  @IsNumber()
  enabled?: number;
}
