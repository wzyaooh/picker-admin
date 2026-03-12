import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateClientUserDto } from './create-client-user.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateClientUserDto extends PartialType(
  OmitType(CreateClientUserDto, ['password']),
) {
  @ApiPropertyOptional({ description: '密码（留空不修改）' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password?: string;
}
