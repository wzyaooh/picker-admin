/**
 * 角色相关类型定义
 *
 * 定义了角色实体、角色创建/更新参数、角色查询参数等类型。
 */

import type { BaseEntity, PageParams } from './api';
import type { Permission } from './permission';

/**
 * 角色实体
 *
 * 角色的完整信息，包含所有字段。
 *
 * @example
 * ```typescript
 * const role: Role = {
 *   id: 1,
 *   code: 'ADMIN',
 *   name: '管理员',
 *   description: '系统管理员角色',
 *   enabled: true,
 *   permissions: [{ id: 1, code: 'user:view', name: '查看用户' }],
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-01T00:00:00Z',
 * };
 * ```
 */
export interface Role extends BaseEntity {
  /** 角色编码（唯一，1-50字符） */
  code: string;
  /** 角色名称（唯一，1-50字符） */
  name: string;
  /** 角色描述（可选，最多200字符） */
  description?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 角色权限列表 */
  permissions?: Permission[];
  /** 用户数量 */
  userCount?: number;
}

/**
 * 创建角色参数
 *
 * 创建角色时需要提供的参数。
 *
 * @example
 * ```typescript
 * const params: CreateRoleParams = {
 *   code: 'MANAGER',
 *   name: '经理',
 *   description: '部门经理角色',
 *   enabled: true,
 *   permissionIds: [1, 2, 3],
 * };
 * await createRoleApi(params);
 * ```
 */
export interface CreateRoleParams {
  /** 角色编码（必填，唯一，1-50字符） */
  code: string;
  /** 角色名称（必填，唯一，1-50字符） */
  name: string;
  /** 角色描述（可选，最多200字符） */
  description?: string;
  /** 是否启用（可选，默认true） */
  enabled?: boolean;
  /** 权限ID列表（可选） */
  permissionIds?: number[];
}

/**
 * 更新角色参数
 *
 * 更新角色时需要提供的参数（部分更新）。
 *
 * @example
 * ```typescript
 * const params: UpdateRoleParams = {
 *   name: '新角色名称',
 *   description: '新的角色描述',
 *   enabled: false,
 * };
 * await updateRoleApi(roleId, params);
 * ```
 */
export interface UpdateRoleParams {
  /** 角色编码（可选，唯一，1-50字符） */
  code?: string;
  /** 角色名称（可选，唯一，1-50字符） */
  name?: string;
  /** 角色描述（可选，最多200字符） */
  description?: string;
  /** 是否启用（可选） */
  enabled?: boolean;
}

/**
 * 查询角色参数
 *
 * 查询角色列表时使用的参数。
 *
 * @example
 * ```typescript
 * const params: QueryRoleParams = {
 *   pageNo: 1,
 *   pageSize: 20,
 *   keyword: 'admin',
 *   enabled: true,
 * };
 * const result = await getRolePageApi(params);
 * ```
 */
export interface QueryRoleParams extends PageParams {
  /** 搜索关键词（角色编码、角色名称） */
  keyword?: string;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 分配角色权限参数
 *
 * 为角色分配权限时使用。
 *
 * @example
 * ```typescript
 * const params: AssignRolePermissionsParams = {
 *   roleId: 1,
 *   permissionIds: [1, 2, 3, 4, 5],
 * };
 * await addRolePermissionsApi(params);
 * ```
 */
export interface AssignRolePermissionsParams {
  /** 角色ID */
  roleId: number;
  /** 权限ID列表 */
  permissionIds: number[];
}

/**
 * 分配角色用户参数
 *
 * 为角色分配用户时使用。
 *
 * @example
 * ```typescript
 * const params: AssignRoleUsersParams = {
 *   roleId: 1,
 *   userIds: [1, 2, 3],
 * };
 * await addRoleUsersApi(params.roleId, params);
 * ```
 */
export interface AssignRoleUsersParams {
  /** 角色ID */
  roleId: number;
  /** 用户ID列表 */
  userIds: number[];
}

/**
 * 移除角色用户参数
 *
 * 从角色中移除用户时使用。
 *
 * @example
 * ```typescript
 * const params: RemoveRoleUsersParams = {
 *   roleId: 1,
 *   userIds: [1, 2],
 * };
 * await removeRoleUsersApi(params.roleId, params);
 * ```
 */
export interface RemoveRoleUsersParams {
  /** 角色ID */
  roleId: number;
  /** 用户ID列表 */
  userIds: number[];
}

/**
 * 角色简要信息
 *
 * 用于下拉选择器等场景的简化角色信息。
 *
 * @example
 * ```typescript
 * const roleBrief: RoleBrief = {
 *   id: 1,
 *   code: 'ADMIN',
 *   name: '管理员',
 * };
 * ```
 */
export interface RoleBrief {
  /** 角色ID */
  id: number;
  /** 角色编码 */
  code: string;
  /** 角色名称 */
  name: string;
}

/**
 * 角色权限树节点
 *
 * 用于权限树选择器的角色权限数据。
 *
 * @example
 * ```typescript
 * const treeNode: RolePermissionTreeNode = {
 *   id: 1,
 *   name: '系统管理',
 *   code: 'system',
 *   checked: true,
 *   children: [
 *     { id: 2, name: '用户管理', code: 'user', checked: true },
 *   ],
 * };
 * ```
 */
export interface RolePermissionTreeNode {
  /** 权限ID */
  id: number;
  /** 权限名称 */
  name: string;
  /** 权限编码 */
  code: string;
  /** 是否选中 */
  checked?: boolean;
  /** 子权限列表 */
  children?: RolePermissionTreeNode[];
}

/**
 * 角色统计信息
 *
 * 用于仪表盘展示的角色统计数据。
 *
 * @example
 * ```typescript
 * const stats: RoleStatistics = {
 *   total: 10,
 *   enabled: 8,
 *   disabled: 2,
 *   systemRoles: 3,
 *   customRoles: 7,
 * };
 * ```
 */
export interface RoleStatistics {
  /** 总角色数 */
  total: number;
  /** 启用角色数 */
  enabled: number;
  /** 禁用角色数 */
  disabled: number;
  /** 系统角色数 */
  systemRoles: number;
  /** 自定义角色数 */
  customRoles: number;
}
