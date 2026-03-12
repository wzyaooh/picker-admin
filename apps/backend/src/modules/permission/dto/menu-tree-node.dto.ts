import { ApiProperty } from '@nestjs/swagger';

import { PermissionType } from '@/types';

/**
 * 菜单树节点 DTO
 * 用于返回菜单树形结构数据
 */
export class MenuTreeNodeDto {
  /**
   * 权限ID
   */
  @ApiProperty({ description: '权限ID', example: 1 })
  id: number;

  /**
   * 权限名称
   */
  @ApiProperty({ description: '权限名称', example: '系统管理' })
  name: string;

  /**
   * 权限编码
   */
  @ApiProperty({ description: '权限编码', example: 'system' })
  code: string;

  /**
   * 权限类型
   */
  @ApiProperty({ description: '权限类型', enum: ['MODULE', 'CATALOG', 'MENU'], example: 'MODULE' })
  type: PermissionType;

  /**
   * 路由路径
   */
  @ApiProperty({ description: '路由路径', required: false, example: '/user/list' })
  path?: string;

  /**
   * 图标
   */
  @ApiProperty({ description: '图标', required: false, example: 'user-icon' })
  icon?: string;

  /**
   * 排序值
   */
  @ApiProperty({ description: '排序值', required: false, example: 1 })
  sort?: number;

  /**
   * 父节点ID
   */
  @ApiProperty({ description: '父节点ID', required: false, example: 1 })
  parentId?: number;

  /**
   * 组件路径
   * 相对于 views 目录
   */
  @ApiProperty({
    description: '组件路径（相对于 views 目录）',
    required: false,
    example: '/client/user/index.vue',
  })
  component?: string;

  /**
   * 布局组件
   */
  @ApiProperty({
    description: '布局组件',
    required: false,
    example: 'BasicLayout',
  })
  layout?: string;

  /**
   * 重定向路径
   */
  @ApiProperty({
    description: '重定向路径',
    required: false,
    example: '/user/list',
  })
  redirect?: string;

  /**
   * 是否缓存页面
   */
  @ApiProperty({
    description: '是否缓存页面',
    required: false,
    default: false,
    example: true,
  })
  keepAlive?: boolean;

  /**
   * 是否在菜单中显示
   */
  @ApiProperty({
    description: '是否在菜单中显示',
    required: false,
    default: true,
    example: true,
  })
  show?: boolean;

  /**
   * 子节点列表
   */
  @ApiProperty({ description: '子节点列表', type: [MenuTreeNodeDto] })
  children: MenuTreeNodeDto[];
}

/**
 * 模块信息 DTO
 * 用于返回模块基本信息
 */
export class ModuleInfoDto {
  /**
   * 模块ID
   */
  @ApiProperty({ description: '模块ID', example: 1 })
  id: number;

  /**
   * 模块名称
   */
  @ApiProperty({ description: '模块名称', example: '系统管理' })
  name: string;

  /**
   * 模块编码
   */
  @ApiProperty({ description: '模块编码', example: 'system' })
  code: string;

  /**
   * 模块图标
   */
  @ApiProperty({ description: '模块图标', required: false, example: 'system-icon' })
  icon?: string;

  /**
   * 排序值
   */
  @ApiProperty({ description: '排序值', required: false, example: 1 })
  sort?: number;
}
