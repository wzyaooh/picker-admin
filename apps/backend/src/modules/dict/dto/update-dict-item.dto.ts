import { PartialType } from '@nestjs/mapped-types';

import { CreateDictItemDto } from './create-dict-item.dto';

/**
 * 更新字典项 DTO
 *
 * 继承自 CreateDictItemDto，所有字段都是可选的
 * 用于更新现有字典项的部分或全部信息
 */
export class UpdateDictItemDto extends PartialType(CreateDictItemDto) {}
