import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

/**
 * 上传文件 DTO
 *
 * 用于指定文件上传的目标位置和存储配置
 */
export class UploadFileDto {
  /**
   * 文件夹ID
   *
   * 指定文件上传到哪个文件夹
   * 不传则上传到根目录
   */
  @ApiPropertyOptional({
    description: '文件夹ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  folderId?: number;

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
