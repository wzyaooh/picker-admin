import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * 创建存储配置 DTO
 *
 * 用于创建新的存储配置
 * 支持本地存储和对象存储（MinIO、S3等）两种类型
 */
export class CreateStorageConfigDto {
  /**
   * 配置名称
   *
   * 存储配置的显示名称
   *
   * @maxLength 100
   */
  @ApiProperty({
    description: '配置名称',
    example: '开发环境',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  /**
   * 存储类型
   *
   * - local: 本地文件系统存储
   * - object: 对象存储（MinIO、S3等）
   */
  @ApiProperty({
    description: '存储类型',
    example: 'local',
    enum: ['local', 'object'],
  })
  @IsString()
  @IsIn(['local', 'object'])
  type: string;

  /**
   * 描述
   *
   * 存储配置的详细说明
   */
  @ApiPropertyOptional({
    description: '描述',
    example: '开发环境本地存储',
  })
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * 是否为默认存储
   *
   * 设置为默认存储后，未指定存储配置的文件将使用此配置
   *
   * @default false
   */
  @ApiPropertyOptional({
    description: '是否为默认存储',
    example: false,
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;

  /**
   * 是否启用
   *
   * 控制存储配置是否可用
   *
   * @default true
   */
  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;

  // ==================== 本地存储配置 ====================

  /**
   * 存储编码
   *
   * 唯一标识存储配置的编码（本地存储）
   *
   * @maxLength 50
   */
  @ApiPropertyOptional({
    description: '存储编码',
    example: 'local_default',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  /**
   * 存储路径
   *
   * 本地文件系统的存储路径（本地存储）
   */
  @ApiPropertyOptional({
    description: '存储路径（本地存储）',
    example: './uploads',
  })
  @IsOptional()
  @IsString()
  storagePath?: string;

  /**
   * 访问路径
   *
   * 文件的 HTTP 访问路径前缀（本地存储）
   */
  @ApiPropertyOptional({
    description: '访问路径（本地存储）',
    example: 'http://localhost:8085/uploads/',
  })
  @IsOptional()
  @IsString()
  accessPath?: string;

  /**
   * 是否启用回收站
   *
   * 启用后，删除的文件会移动到回收站而不是直接删除
   *
   * @default false
   */
  @ApiPropertyOptional({
    description: '是否启用回收站',
    example: false,
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enableRecycleBin?: boolean;

  /**
   * 回收站路径
   *
   * 回收站在存储路径下的相对路径
   */
  @ApiPropertyOptional({
    description: '回收站路径',
    example: '.RECYCLE.BIN/',
  })
  @IsOptional()
  @IsString()
  recycleBinPath?: string;

  /**
   * 排序值
   *
   * 用于控制存储配置的显示顺序，值越小越靠前
   *
   * @default 999
   * @minimum 0
   */
  @ApiPropertyOptional({
    description: '排序',
    example: 999,
    minimum: 0,
    default: 999,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sort?: number;

  // ==================== 对象存储配置 ====================

  /**
   * 对象存储端点
   *
   * 对象存储服务的访问地址（对象存储）
   */
  @ApiPropertyOptional({
    description: '对象存储端点',
    example: 'http://localhost:9000',
  })
  @IsOptional()
  @IsString()
  endpoint?: string;

  /**
   * 访问密钥ID
   *
   * 对象存储的访问密钥ID（对象存储）
   */
  @ApiPropertyOptional({
    description: '访问密钥ID',
    example: 'minioadmin',
  })
  @IsOptional()
  @IsString()
  accessKeyId?: string;

  /**
   * 访问密钥
   *
   * 对象存储的访问密钥（对象存储）
   */
  @ApiPropertyOptional({
    description: '访问密钥',
    example: 'minioadmin',
  })
  @IsOptional()
  @IsString()
  secretAccessKey?: string;

  /**
   * 存储桶名称
   *
   * 对象存储的存储桶名称（对象存储）
   */
  @ApiPropertyOptional({
    description: '存储桶名称',
    example: 'my-bucket',
  })
  @IsOptional()
  @IsString()
  bucket?: string;

  /**
   * 区域
   *
   * 对象存储的区域设置（对象存储）
   */
  @ApiPropertyOptional({
    description: '区域',
    example: 'us-east-1',
  })
  @IsOptional()
  @IsString()
  region?: string;

  /**
   * 是否使用SSL
   *
   * 是否使用 HTTPS 协议访问对象存储（对象存储）
   *
   * @default true
   */
  @ApiPropertyOptional({
    description: '是否使用SSL',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  useSSL?: boolean;
}
