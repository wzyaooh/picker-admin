/**
 * 权限相关类型定义
 *
 * 定义了权限实体、权限创建/更新参数、权限查询参数等类型。
 */

import type { BaseEntity, TreeNode } from './api';

/**
 * 权限类型枚举
 *
 * 定义了系统中的权限类型。
 *
 * @example
 * ```typescript
 * const type: PermissionType = PermissionType.MENU;
 * ```
 */
export enum PermissionType {
  /** 模块 - 顶级分类 */
  MODULE = 'MODULE',
  /** 目录 - 菜单目录 */
  CATALOG = 'CATALOG',
  /** 菜单 - 可访问的页面 */
  MENU = 'MENU',
  /** 按钮 - 页面内的操作按钮 */
  BUTTON = 'BUTTON',
}

/**
 * 权限实体
 *
 * 权限的完整信息，包含所有字段。
 *
 * @example
 * ```typescript
 * const permission: Permission = {
 *   id: 1,
 *   code: 'user:view',
 *   name: '查看用户',
 *   type: PermissionType.MENU,
 *   parentId: null,
 *   path: '/user',
 *   icon: 'user',
 *   sort: 1,
 *   enabled: true,
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-01T00:00:00Z',
 * };
 * ```
 */
export interface Permission extends BaseEntity {
  /** 权限编码（唯一，1-100字符） */
  code: string;
  /** 权限名称（1-50字符） */
  name: string;
  /** 权限类型 */
  type: PermissionType;
  /** 父权限ID（null表示顶级权限） */
  parentId: number | null;
  /** 路由路径（菜单类型必填） */
  path?: string;
  /** 图标（可选） */
  icon?: string;
  /** 排序（数字越小越靠前） */
  sort: number;
  /** 是否启用 */
  enabled: boolean;
  /** 描述（可选，最多200字符） */
  description?: string;
  /** 子权限列表 */
  children?: Permission[];
}

/**
 * 创建权限参数
 *
 * 创建权限时需要提供的参数。
 *
 * @example
 * ```typescript
 * const params: CreatePermissionParams = {
 *   code: 'user:create',
 *   name: '创建用户',
 *   type: PermissionType.BUTTON,
 *   parentId: 1,
 *   sort: 1,
 *   enabled: true,
 * };
 * await createPermissionApi(params);
 * ```
 */
export interface CreatePermissionParams {
  /** 权限编码（必填，唯一，1-100字符） */
  code: string;
  /** 权限名称（必填，1-50字符） */
  name: string;
  /** 权限类型（必填） */
  type: PermissionType;
  /** 父权限ID（可选，null表示顶级权限） */
  parentId?: number | null;
  /** 路由路径（菜单类型必填） */
  path?: string;
  /** 图标（可选） */
  icon?: string;
  /** 排序（可选，默认0） */
  sort?: number;
  /** 是否启用（可选，默认true） */
  enabled?: boolean;
  /** 描述（可选，最多200字符） */
  description?: string;
}

/**
 * 更新权限参数
 *
 * 更新权限时需要提供的参数（部分更新）。
 *
 * @example
 * ```typescript
 * const params: UpdatePermissionParams = {
 *   name: '新权限名称',
 *   path: '/new-path',
 *   sort: 2,
 *   enabled: false,
 * };
 * await updatePermissionApi(permissionId, params);
 * ```
 */
export interface UpdatePermissionParams {
  /** 权限编码（可选，唯一，1-100字符） */
  code?: string;
  /** 权限名称（可选，1-50字符） */
  name?: string;
  /** 权限类型（可选） */
  type?: PermissionType;
  /** 父权限ID（可选） */
  parentId?: number | null;
  /** 路由路径（可选） */
  path?: string;
  /** 图标（可选） */
  icon?: string;
  /** 排序（可选） */
  sort?: number;
  /** 是否启用（可选） */
  enabled?: boolean;
  /** 描述（可选，最多200字符） */
  description?: string;
}

/**
 * 批量创建权限参数
 *
 * 批量创建权限时使用。
 *
 * @example
 * ```typescript
 * const params: BatchCreatePermissionParams = {
 *   permissions: [
 *     { code: 'user:view', name: '查看用户', type: PermissionType.MENU },
 *     { code: 'user:create', name: '创建用户', type: PermissionType.BUTTON },
 *   ],
 * };
 * await batchCreatePermissionApi(params);
 * ```
 */
export interface BatchCreatePermissionParams {
  /** 权限列表 */
  permissions: CreatePermissionParams[];
}

/**
 * 权限树节点
 *
 * 用于权限树展示的数据结构。
 *
 * @example
 * ```typescript
 * const treeNode: PermissionTreeNode = {
 *   id: 1,
 *   parentId: null,
 *   data: {
 *     id: 1,
 *     code: 'system',
 *     name: '系统管理',
 *     type: PermissionType.MODULE,
 *   },
 *   children: [
 *     {
 *       id: 2,
 *       parentId: 1,
 *       data: { id: 2, code: 'user', name: '用户管理' },
 *     },
 *   ],
 * };
 * ```
 */
export interface PermissionTreeNode extends TreeNode<Permission> {
  /** 权限数据 */
  data: Permission;
}

/**
 * 菜单树节点
 *
 * 用于菜单树展示的数据结构（仅包含菜单类型的权限）。
 *
 * @example
 * ```typescript
 * const menuNode: MenuTreeNode = {
 *   id: 1,
 *   name: '系统管理',
 *   path: '/system',
 *   icon: 'system',
 *   children: [
 *     { id: 2, name: '用户管理', path: '/system/user', icon: 'user' },
 *   ],
 * };
 * ```
 */
export interface MenuTreeNode {
  /** 菜单ID */
  id: number;
  /** 菜单名称 */
  name: string;
  /** 路由路径 */
  path: string;
  /** 图标 */
  icon?: string;
  /** 父菜单ID */
  parentId?: number | null;
  /** 子菜单列表 */
  children?: MenuTreeNode[];
}

/**
 * 按钮权限
 *
 * 页面内的按钮权限信息。
 *
 * @example
 * ```typescript
 * const button: ButtonPermission = {
 *   id: 1,
 *   code: 'user:create',
 *   name: '新增',
 *   parentId: 1,
 * };
 * ```
 */
export interface ButtonPermission {
  /** 按钮ID */
  id: number;
  /** 按钮编码 */
  code: string;
  /** 按钮名称 */
  name: string;
  /** 父权限ID（所属菜单） */
  parentId: number;
}

/**
 * 校验菜单路径参数
 *
 * 校验菜单路径是否可用时使用。
 *
 * @example
 * ```typescript
 * const params: ValidateMenuPathParams = {
 *   path: '/system/user',
 *   excludeId: 1, // 排除当前编辑的菜单
 * };
 * const isValid = await validateMenuPathApi(params);
 * ```
 */
export interface ValidateMenuPathParams {
  /** 菜单路径 */
  path: string;
  /** 排除的权限ID（编辑时使用） */
  excludeId?: number;
}

/**
 * 权限简要信息
 *
 * 用于下拉选择器等场景的简化权限信息。
 *
 * @example
 * ```typescript
 * const permissionBrief: PermissionBrief = {
 *   id: 1,
 *   code: 'user:view',
 *   name: '查看用户',
 *   type: PermissionType.MENU,
 * };
 * ```
 */
export interface PermissionBrief {
  /** 权限ID */
  id: number;
  /** 权限编码 */
  code: string;
  /** 权限名称 */
  name: string;
  /** 权限类型 */
  type: PermissionType;
}

/**
 * 权限统计信息
 *
 * 用于仪表盘展示的权限统计数据。
 *
 * @example
 * ```typescript
 * const stats: PermissionStatistics = {
 *   total: 100,
 *   modules: 5,
 *   catalogs: 10,
 *   menus: 50,
 *   buttons: 35,
 * };
 * ```
 */
export interface PermissionStatistics {
  /** 总权限数 */
  total: number;
  /** 模块数 */
  modules: number;
  /** 目录数 */
  catalogs: number;
  /** 菜单数 */
  menus: number;
  /** 按钮数 */
  buttons: number;
}
