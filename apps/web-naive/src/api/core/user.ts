import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/**
 * 用户相关 API 类型定义
 */
export namespace UserApi {
  /**
   * 部门信息
   */
  export interface Department {
    /** 部门ID */
    id: number;
    /** 部门名称 */
    name: string;
    /** 部门编码 */
    code: string;
  }

  /**
   * 岗位信息
   */
  export interface Position {
    /** 岗位ID */
    id: number;
    /** 岗位名称 */
    name: string;
    /** 岗位编码 */
    code: string;
  }

  /**
   * 角色信息
   */
  export interface Role {
    /** 角色ID */
    id: number;
    /** 角色名称 */
    name: string;
    /** 角色编码 */
    code: string;
  }

  /**
   * 用户基础信息
   */
  export interface User {
    /** 用户ID */
    id: number;
    /** 用户名（登录账号） */
    username: string;
    /** 是否启用 */
    enabled: boolean;
    /** 创建时间 */
    createdAt: string;
    /** 更新时间 */
    updatedAt: string;
    /** 部门ID */
    departmentId?: number;
    /** 部门信息 */
    department?: Department;
    /** 岗位ID */
    positionId?: number;
    /** 岗位信息 */
    position?: Position;
    /** 角色列表 */
    roles?: Role[];
    /** 个人资料 */
    profile?: UserProfile;
  }

  /**
   * 用户个人资料
   */
  export interface UserProfile {
    /** 资料ID */
    id: number;
    /** 用户ID */
    userId: number;
    /** 真实姓名 */
    realName?: string;
    /** 昵称 */
    nickname?: string;
    /** 邮箱 */
    email?: string;
    /** 手机号 */
    phone?: string;
    /** 头像URL */
    avatar?: string;
    /** 性别（MALE-男，FEMALE-女，UNKNOWN-未知） */
    gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
    /** 生日（YYYY-MM-DD） */
    birthday?: string;
    /** 地址 */
    address?: string;
  }

  /**
   * 创建用户请求参数
   */
  export interface CreateUserParams {
    /** 用户名（必填，1-50字符，必须唯一） */
    username: string;
    /** 是否启用（可选，默认true） */
    enabled?: boolean;
    /** 部门ID（可选） */
    departmentId?: number;
    /** 岗位ID（可选） */
    positionId?: number;
    /** 角色ID列表（可选） */
    roleIds?: number[];
    /** 个人资料（可选） */
    profile?: Partial<UserProfile>;
  }

  /**
   * 更新用户请求参数
   */
  export interface UpdateUserParams {
    /** 用户名（可选，1-50字符） */
    username?: string;
    /** 是否启用（可选） */
    enabled?: boolean;
    /** 部门ID（可选） */
    departmentId?: number;
    /** 岗位ID（可选） */
    positionId?: number;
    /** 角色ID列表（可选） */
    roleIds?: number[];
  }

  /**
   * 更新个人资料请求参数
   */
  export interface UpdateProfileParams {
    /** 真实姓名（可选，1-50字符） */
    realName?: string;
    /** 昵称（可选，1-50字符） */
    nickname?: string;
    /** 邮箱（可选，需符合邮箱格式） */
    email?: string;
    /** 手机号（可选，需符合手机号格式） */
    phone?: string;
    /** 头像URL（可选） */
    avatar?: string;
    /** 性别（可选） */
    gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
    /** 生日（可选，YYYY-MM-DD格式） */
    birthday?: string;
    /** 地址（可选，最多200字符） */
    address?: string;
  }

  /**
   * 查询用户请求参数
   */
  export interface QueryUserParams {
    /** 页码（从1开始） */
    pageNo?: number;
    /** 每页数量（默认10） */
    pageSize?: number;
    /** 用户名（模糊查询） */
    username?: string;
    /** 性别筛选 */
    gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
    /** 角色ID筛选 */
    role?: number;
    /** 启用状态筛选 */
    enable?: boolean;
    /** 部门ID筛选 */
    departmentId?: number;
    /** 岗位ID筛选 */
    positionId?: number;
  }

  /**
   * 分页查询结果
   */
  export interface PageResult {
    /** 用户数据列表 */
    pageData: User[];
    /** 总记录数 */
    total: number;
    /** 当前页码 */
    page?: number;
    /** 每页数量 */
    pageSize?: number;
  }
}

// ==================== API 函数 ====================

/**
 * 获取当前用户信息
 *
 * 获取当前登录用户的详细信息，包括用户名、角色、权限等。
 * 此接口需要用户已登录，会根据请求中的令牌识别用户身份。
 * 返回的用户信息通常用于显示在页面头部、个人中心等位置。
 *
 * @returns 当前用户信息
 * @throws {Error} 当用户未登录时抛出错误
 * @throws {Error} 当令牌无效或过期时抛出错误
 *
 * @example
 * ```typescript
 * // 获取当前用户信息
 * const userInfo = await getUserInfoApi();
 * console.log(userInfo.username);
 * console.log(userInfo.roles);
 * ```
 */
export async function getUserInfoApi(): Promise<UserInfo> {
  return requestClient.get<UserInfo>('/user/detail');
}

/**
 * 创建用户
 *
 * 创建新用户账号，需要提供用户名和密码。
 * 可以同时设置用户的部门、岗位、角色和个人资料信息。
 * 用户名必须唯一，密码需要符合安全要求（6-20字符）。
 * 创建成功后，用户可以使用用户名和密码登录系统。
 *
 * @param data 用户创建数据
 * @param data.username 用户名（必填，1-50字符，必须唯一）
 * @param data.password 密码（必填，6-20字符）
 * @param data.enabled 是否启用（可选，默认true）
 * @param data.departmentId 部门ID（可选）
 * @param data.positionId 岗位ID（可选）
 * @param data.roleIds 角色ID列表（可选）
 * @param data.profile 个人资料（可选）
 * @returns 创建成功的用户信息
 * @throws {Error} 当用户名已存在时抛出错误
 * @throws {Error} 当部门或岗位不存在时抛出错误
 * @throws {Error} 当角色不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 创建基本用户
 * const user = await createUserApi({
 *   username: 'newuser',
 *   password: '123456',
 *   enabled: true
 * });
 * ```
 *
 * @example
 * ```typescript
 * // 创建完整用户信息
 * const user = await createUserApi({
 *   username: 'newuser',
 *   password: '123456',
 *   enabled: true,
 *   departmentId: 1,
 *   positionId: 2,
 *   roleIds: [1, 2],
 *   profile: {
 *     realName: '张三',
 *     email: 'zhangsan@example.com',
 *     phone: '13800138000'
 *   }
 * });
 * ```
 */
export async function createUserApi(data: UserApi.CreateUserParams): Promise<UserApi.User> {
  return requestClient.post<UserApi.User>('/user', data);
}

/**
 * 查询用户列表
 *
 * 分页查询用户列表，支持多种筛选条件。
 * 可以按用户名、性别、角色、启用状态、部门、岗位等条件筛选。
 * 返回的用户列表包含用户的基本信息、部门、岗位和角色信息。
 *
 * @param params 查询参数
 * @param params.pageNo 页码（可选，从1开始，默认1）
 * @param params.pageSize 每页数量（可选，默认10）
 * @param params.username 用户名（可选，模糊查询）
 * @param params.gender 性别（可选，MALE/FEMALE/UNKNOWN）
 * @param params.role 角色ID（可选）
 * @param params.enable 启用状态（可选，true/false）
 * @param params.departmentId 部门ID（可选）
 * @param params.positionId 岗位ID（可选）
 * @returns 分页查询结果，包含用户列表和总数
 * @throws {Error} 当查询参数不合法时抛出错误
 *
 * @example
 * ```typescript
 * // 基本分页查询
 * const result = await getUserListApi({
 *   pageNo: 1,
 *   pageSize: 20
 * });
 * console.log(result.pageData); // 用户列表
 * console.log(result.total); // 总记录数
 * ```
 *
 * @example
 * ```typescript
 * // 带筛选条件的查询
 * const result = await getUserListApi({
 *   pageNo: 1,
 *   pageSize: 20,
 *   username: 'admin',
 *   enable: true,
 *   departmentId: 1
 * });
 * ```
 */
export async function getUserListApi(params: UserApi.QueryUserParams): Promise<UserApi.PageResult> {
  return requestClient.get<UserApi.PageResult>('/user', { params });
}

/**
 * 根据用户名查询用户
 *
 * 根据用户名精确查询用户信息。
 * 返回的用户信息包含部门、岗位、角色和个人资料等完整信息。
 * 此接口通常用于用户详情页面或编辑用户时加载数据。
 *
 * @param username 用户名（精确匹配）
 * @returns 用户详细信息
 * @throws {Error} 当用户不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 查询用户
 * const user = await getUserByUsernameApi('admin');
 * console.log(user.username);
 * console.log(user.roles);
 * console.log(user.profile);
 * ```
 */
export async function getUserByUsernameApi(username: string): Promise<UserApi.User> {
  return requestClient.get<UserApi.User>(`/user/${username}`);
}

/**
 * 更新用户信息
 *
 * 更新用户的基本信息，包括用户名、启用状态、部门、岗位和角色。
 * 可以只更新部分字段，未提供的字段保持不变。
 * 更新用户名时，新用户名必须唯一。
 *
 * @param id 用户ID
 * @param data 更新数据
 * @param data.username 用户名（可选，1-50字符）
 * @param data.enabled 是否启用（可选）
 * @param data.departmentId 部门ID（可选）
 * @param data.positionId 岗位ID（可选）
 * @param data.roleIds 角色ID列表（可选）
 * @returns 更新后的用户信息
 * @throws {Error} 当用户不存在时抛出错误
 * @throws {Error} 当用户名已被占用时抛出错误
 * @throws {Error} 当部门或岗位不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 更新用户启用状态
 * const user = await updateUserApi(1, {
 *   enabled: false
 * });
 * ```
 *
 * @example
 * ```typescript
 * // 更新用户部门和角色
 * const user = await updateUserApi(1, {
 *   departmentId: 2,
 *   roleIds: [1, 3]
 * });
 * ```
 */
export async function updateUserApi(
  id: number,
  data: UserApi.UpdateUserParams
): Promise<UserApi.User> {
  return requestClient.patch<UserApi.User>(`/user/${id}`, data);
}

/**
 * 更新用户个人资料
 *
 * 更新用户的个人资料信息，包括真实姓名、昵称、邮箱、手机号、头像等。
 * 可以只更新部分字段，未提供的字段保持不变。
 * 邮箱和手机号需要符合格式要求。
 *
 * @param id 用户ID
 * @param data 个人资料数据
 * @param data.realName 真实姓名（可选，1-50字符）
 * @param data.nickname 昵称（可选，1-50字符）
 * @param data.email 邮箱（可选，需符合邮箱格式）
 * @param data.phone 手机号（可选，需符合手机号格式）
 * @param data.avatar 头像URL（可选）
 * @param data.gender 性别（可选，MALE/FEMALE/UNKNOWN）
 * @param data.birthday 生日（可选，YYYY-MM-DD格式）
 * @param data.address 地址（可选，最多200字符）
 * @returns 更新后的个人资料
 * @throws {Error} 当用户不存在时抛出错误
 * @throws {Error} 当邮箱格式不正确时抛出错误
 * @throws {Error} 当手机号格式不正确时抛出错误
 *
 * @example
 * ```typescript
 * // 更新个人资料
 * const profile = await updateProfileApi(1, {
 *   realName: '张三',
 *   email: 'zhangsan@example.com',
 *   phone: '13800138000'
 * });
 * ```
 *
 * @example
 * ```typescript
 * // 更新头像
 * const profile = await updateProfileApi(1, {
 *   avatar: 'https://example.com/avatar.jpg'
 * });
 * ```
 */
export async function updateProfileApi(
  id: number,
  data: UserApi.UpdateProfileParams
): Promise<UserApi.UserProfile> {
  return requestClient.patch<UserApi.UserProfile>(`/user/profile/${id}`, data);
}

/**
 * 删除用户
 *
 * 删除指定的用户账号。
 * 删除操作不可恢复，请谨慎使用。
 * 通常建议使用禁用功能（enabled=false）而不是直接删除用户。
 * 超级管理员账号不能被删除。
 *
 * @param id 用户ID
 * @returns 删除是否成功
 * @throws {Error} 当用户不存在时抛出错误
 * @throws {Error} 当尝试删除超级管理员时抛出错误
 * @throws {Error} 当用户有关联数据时抛出错误
 *
 * @example
 * ```typescript
 * // 删除用户
 * const success = await deleteUserApi(1);
 * if (success) {
 *   message.success('用户删除成功');
 *   // 刷新用户列表
 *   await fetchUserList();
 * }
 * ```
 */
export async function deleteUserApi(id: number): Promise<boolean> {
  return requestClient.delete<boolean>(`/user/${id}`);
}

/**
 * 重置用户密码
 *
 * 将指定用户的密码重置为默认密码（123456）。
 * 需要超级管理员权限。
 *
 * @param id 用户ID
 * @returns 重置是否成功
 */
export async function resetPasswordApi(id: number): Promise<boolean> {
  return requestClient.patch<boolean>(`/user/${id}/reset-password`);
}

