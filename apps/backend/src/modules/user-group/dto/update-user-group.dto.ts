import { PartialType } from '@nestjs/mapped-types';

import { CreateUserGroupDto } from './create-user-group.dto';

/**
 * 更新用户组 DTO
 *
 * 继承自 CreateUserGroupDto，所有字段都是可选的
 * 用于更新现有用户组的部分或全部信息
 */
export class UpdateUserGroupDto extends PartialType(CreateUserGroupDto) {}
