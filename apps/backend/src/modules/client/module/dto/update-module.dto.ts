import { PartialType } from '@nestjs/swagger';

import { CreateModuleDto } from './create-module.dto';

/**
 * 更新模块 DTO
 *
 * 继承自 CreateModuleDto，所有字段都是可选的
 * 用于更新现有模块的部分或全部信息
 */
export class UpdateModuleDto extends PartialType(CreateModuleDto) {}
