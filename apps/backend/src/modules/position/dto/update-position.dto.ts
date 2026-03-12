import { PartialType } from '@nestjs/mapped-types';

import { CreatePositionDto } from './create-position.dto';

/**
 * 更新岗位 DTO
 * 继承自 CreatePositionDto，所有字段都是可选的
 */
export class UpdatePositionDto extends PartialType(CreatePositionDto) {}
