/**
 * 类型定义统一导出
 *
 * 集中管理所有类型定义，方便导入使用。
 *
 * @example
 * ```typescript
 * // 导入错误类型
 * import { ApiError, HttpErrorCode, BusinessErrorCode } from '@/types';
 *
 * // 导入 API 通用类型
 * import type { PageParams, PageResult } from '@/types';
 *
 * // 导入用户类型
 * import type { User, CreateUserParams } from '@/types';
 *
 * // 导入角色类型
 * import type { Role, CreateRoleParams } from '@/types';
 *
 * // 导入权限类型
 * import type { Permission, PermissionType } from '@/types';
 * ```
 */

// API 通用类型
export * from './api';

// 错误类型
export * from './error';

// 用户类型
export * from './user';

// 角色类型
export * from './role';

// 权限类型
export * from './permission';
