import { PartialType } from '@nestjs/swagger';

import { CreateMenuDto } from './create-menu.dto';

/**
 * 更新菜单 DTO
 *
 * 继承自 CreateMenuDto，所有字段都是可选的
 * 用于更新现有菜单的部分或全部信息
 */
export class UpdateMenuDto extends PartialType(CreateMenuDto) {}
