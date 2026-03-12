import { PartialType } from '@nestjs/swagger';

import { CreatePermissionDto } from './create-permission.dto';

/**
 * 更新权限 DTO
 * 继承自 CreatePermissionDto，所有字段都是可选的
 */
export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {}
