/**
 * 用户相关类型定义
 *
 * 定义了用户实体、用户创建/更新参数、用户查询参数等类型。
 */

import type { BaseEntity, PageParams } from './api';
import type { Role } from './role';

/**
 * 用户实体
 *
 * 用户的完整信息，包含所有字段。
 *
 * @example
 * ```typescript
 * const user: User = {
 *   id: 1,
 *   username: 'admin',
 *   email: 'admin@example.com',
 *   nickname: '管理员',
 *   avatar: 'https://example.com/avatar.jpg',
 *   enabled: true,
 *   roles: [{ id: 1, code: 'ADMIN', name: '管理员' }],
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-01T00:00:00Z',
 * };
 * ```
 */
export interface User extends BaseEntity {
  /** 用户名（唯一，1-50字符） */
  username: string;
  /** 邮箱（唯一） */
  email: string;
  /** 昵称（可选，1-50字符） */
  nickname?: string;
  /** 头像URL（可选） */
  avatar?: string;
  /** 手机号（可选） */
  phone?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 用户角色列表 */
  roles?: Role[];
  /** 最后登录时间 */
  lastLoginAt?: string;
  /** 最后登录IP */
  lastLoginIp?: string;
}

/**
 * 创建用户参数
 *
 * 创建用户时需要提供的参数。
 *
 * @example
 * ```typescript
 * const params: CreateUserParams = {
 *   username: 'newuser',
 *   password: '123456',
 *   email: 'newuser@example.com',
 *   nickname: '新用户',
 *   enabled: true,
 *   roleIds: [2, 3],
 * };
 * await createUserApi(params);
 * ```
 */
export interface CreateUserParams {
  /** 用户名（必填，1-50字符） */
  username: string;
  /** 密码（必填，6-20字符） */
  password: string;
  /** 邮箱（必填） */
  email: string;
  /** 昵称（可选，1-50字符） */
  nickname?: string;
  /** 头像URL（可选） */
  avatar?: string;
  /** 手机号（可选） */
  phone?: string;
  /** 是否启用（可选，默认true） */
  enabled?: boolean;
  /** 角色ID列表（可选） */
  roleIds?: number[];
}

/**
 * 更新用户参数
 *
 * 更新用户时需要提供的参数（部分更新）。
 *
 * @example
 * ```typescript
 * const params: UpdateUserParams = {
 *   nickname: '新昵称',
 *   email: 'newemail@example.com',
 *   enabled: false,
 * };
 * await updateUserApi(userId, params);
 * ```
 */
export interface UpdateUserParams {
  /** 用户名（可选，1-50字符） */
  username?: string;
  /** 邮箱（可选） */
  email?: string;
  /** 昵称（可选，1-50字符） */
  nickname?: string;
  /** 头像URL（可选） */
  avatar?: string;
  /** 手机号（可选） */
  phone?: string;
  /** 是否启用（可选） */
  enabled?: boolean;
  /** 角色ID列表（可选） */
  roleIds?: number[];
}

/**
 * 更新个人资料参数
 *
 * 用户更新自己的个人资料时使用。
 *
 * @example
 * ```typescript
 * const params: UpdateProfileParams = {
 *   nickname: '我的新昵称',
 *   avatar: 'https://example.com/new-avatar.jpg',
 *   phone: '13800138000',
 * };
 * await updateProfileApi(params);
 * ```
 */
export interface UpdateProfileParams {
  /** 昵称（可选，1-50字符） */
  nickname?: string;
  /** 头像URL（可选） */
  avatar?: string;
  /** 手机号（可选） */
  phone?: string;
}

/**
 * 修改密码参数
 *
 * 用户修改密码时使用。
 *
 * @example
 * ```typescript
 * const params: ChangePasswordParams = {
 *   oldPassword: '123456',
 *   newPassword: '654321',
 * };
 * await changePasswordApi(params);
 * ```
 */
export interface ChangePasswordParams {
  /** 旧密码（必填，6-20字符） */
  oldPassword: string;
  /** 新密码（必填，6-20字符） */
  newPassword: string;
}

/**
 * 重置密码参数
 *
 * 管理员重置用户密码时使用。
 *
 * @example
 * ```typescript
 * const params: ResetPasswordParams = {
 *   userId: 1,
 *   newPassword: '123456',
 * };
 * await resetPasswordApi(params);
 * ```
 */
export interface ResetPasswordParams {
  /** 用户ID */
  userId: number;
  /** 新密码（必填，6-20字符） */
  newPassword: string;
}

/**
 * 查询用户参数
 *
 * 查询用户列表时使用的参数。
 *
 * @example
 * ```typescript
 * const params: QueryUserParams = {
 *   pageNo: 1,
 *   pageSize: 20,
 *   keyword: 'admin',
 *   enabled: true,
 *   roleId: 1,
 * };
 * const result = await getUserListApi(params);
 * ```
 */
export interface QueryUserParams extends PageParams {
  /** 搜索关键词（用户名、邮箱、昵称） */
  keyword?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 角色ID */
  roleId?: number;
  /** 开始日期 */
  startDate?: string;
  /** 结束日期 */
  endDate?: string;
}

/**
 * 用户简要信息
 *
 * 用于下拉选择器等场景的简化用户信息。
 *
 * @example
 * ```typescript
 * const userBrief: UserBrief = {
 *   id: 1,
 *   username: 'admin',
 *   nickname: '管理员',
 *   avatar: 'https://example.com/avatar.jpg',
 * };
 * ```
 */
export interface UserBrief {
  /** 用户ID */
  id: number;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname?: string;
  /** 头像URL */
  avatar?: string;
}

/**
 * 用户统计信息
 *
 * 用于仪表盘展示的用户统计数据。
 *
 * @example
 * ```typescript
 * const stats: UserStatistics = {
 *   total: 1000,
 *   enabled: 800,
 *   disabled: 200,
 *   newToday: 10,
 *   activeToday: 500,
 * };
 * ```
 */
export interface UserStatistics {
  /** 总用户数 */
  total: number;
  /** 启用用户数 */
  enabled: number;
  /** 禁用用户数 */
  disabled: number;
  /** 今日新增用户数 */
  newToday: number;
  /** 今日活跃用户数 */
  activeToday: number;
}
