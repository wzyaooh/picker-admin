import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * 重命名文件 DTO
 *
 * 用于修改文件或文件夹的名称
 */
export class RenameFileDto {
  /**
   * 新文件名
   *
   * 文件或文件夹的新名称
   *
   * @maxLength 255
   */
  @ApiProperty({
    description: '新文件名',
    example: 'document.pdf',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  newName: string;
}
