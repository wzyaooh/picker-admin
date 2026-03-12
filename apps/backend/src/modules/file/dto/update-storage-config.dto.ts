import { PartialType } from '@nestjs/mapped-types';

import { CreateStorageConfigDto } from './create-storage-config.dto';

/**
 * 更新存储配置 DTO
 *
 * 继承自 CreateStorageConfigDto，所有字段都是可选的
 * 用于更新现有存储配置的部分或全部信息
 */
export class UpdateStorageConfigDto extends PartialType(CreateStorageConfigDto) {}
