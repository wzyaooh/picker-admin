import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 创建文件夹 DTO
 *
 * 用于在文件系统中创建新文件夹
 */
export class CreateFolderDto {
  /**
   * 文件夹名称
   *
   * @maxLength 255
   */
  @ApiProperty({
    description: '文件夹名称',
    example: 'Documents',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  /**
   * 父文件夹ID
   *
   * 指定在哪个文件夹下创建
   * - null 或不传: 在根目录创建
   * - 数字: 在指定文件夹下创建
   */
  @ApiPropertyOptional({
    description: '父文件夹ID（null表示根目录）',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  parentId?: number | null;

  /**
   * 存储配置ID
   *
   * 指定使用哪个存储配置
   * 不传则使用默认存储配置
   */
  @ApiPropertyOptional({
    description: '存储配置ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  storageConfigId?: number;
}
