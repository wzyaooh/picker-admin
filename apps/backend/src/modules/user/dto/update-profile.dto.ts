import { ApiPropertyOptional } from '@nestjs/swagger';

import { ProfileDto } from './profile.dto';

/**
 * 更新用户资料 DTO
 * 继承自 ProfileDto，用于更新用户资料时的数据传输
 */
export class UpdateProfileDto extends ProfileDto {}
