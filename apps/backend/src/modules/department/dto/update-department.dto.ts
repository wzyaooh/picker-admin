import { PartialType } from '@nestjs/swagger';

import { CreateDepartmentDto } from './create-department.dto';

/**
 * 更新部门 DTO
 * 继承自 CreateDepartmentDto，所有字段都是可选的
 */
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
