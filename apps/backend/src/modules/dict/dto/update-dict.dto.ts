import { PartialType } from '@nestjs/mapped-types';

import { CreateDictDto } from './create-dict.dto';

/**
 * 更新字典 DTO
 *
 * 继承自 CreateDictDto，所有字段都是可选的
 * 用于更新现有字典的部分或全部信息
 */
export class UpdateDictDto extends PartialType(CreateDictDto) {}
