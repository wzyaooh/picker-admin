import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/**
 * 角色相关 API 类型定义
 */
export namespace RoleApi {
  /**
   * 角色基础信息
   */
  export interface Role {
    /** 角色ID */
    id: number;
    /** 角色名称 */
    name: string;
    /** 角色编码（唯一标识） */
    code: string;
    /** 角色描述 */
    description?: string;
    /** 是否启用 */
    enabled: boolean;
    /** 创建时间 */
    createdAt: string;
    /** 更新时间 */
    updatedAt: string;
    /** 关联的用户列表 */
    users?: Array<{ id: number; username: string }>;
    /** 关联的权限列表 */
    permissions?: Array<{ id: number; name: string }>;
  }

  /**
   * 创建角色请求参数
   */
  export interface CreateRoleParams {
    /** 角色名称（必填，1-50字符） */
    name: string;
    /** 角色编码（必填，1-50字符，必须唯一） */
    code: string;
    /** 角色描述（可选，最多200字符） */
    description?: string;
    /** 是否启用（可选，默认true） */
    enabled?: boolean;
  }

  /**
   * 更新角色请求参数
   */
  export interface UpdateRoleParams {
    /** 角色名称（可选，1-50字符） */
    name?: string;
    /** 角色编码（可选，1-50字符） */
    code?: string;
    /** 角色描述（可选，最多200字符） */
    description?: string;
    /** 是否启用（可选） */
    enabled?: boolean;
  }

  /**
   * 查询角色请求参数
   */
  export interface QueryRoleParams {
    /** 页码（从1开始） */
    page?: number;
    /** 每页数量（默认10） */
    pageSize?: number;
    /** 角色名称（模糊查询） */
    name?: string;
    /** 角色编码（模糊查询） */
    code?: string;
    /** 启用状态筛选 */
    enabled?: boolean;
  }

  /**
   * 分页查询结果
   */
  export interface PageResult {
    /** 角色数据列表 */
    pageData: Role[];
    /** 总记录数 */
    total: number;
    /** 当前页码 */
    page?: number;
    /** 每页数量 */
    pageSize?: number;
  }

  /**
   * 角色权限分配参数
   */
  export interface RolePermissionsParams {
    /** 角色ID */
    id: number;
    /** 权限ID列表 */
    permissionIds: number[];
  }

  /**
   * 角色用户分配参数
   */
  export interface RoleUsersParams {
    /** 用户ID列表 */
    userIds: number[];
  }

  /**
   * 查询角色用户请求参数
   */
  export interface QueryRoleUsersParams {
    /** 角色ID */
    roleId: number;
    /** 页码（从1开始） */
    pageNo?: number;
    /** 每页数量（默认10） */
    pageSize?: number;
    /** 用户名（模糊查询） */
    username?: string;
    /** 真实姓名（模糊查询） */
    realName?: string;
  }

  /**
   * 用户信息
   */
  export interface User {
    /** 用户ID */
    id: number;
    /** 用户名 */
    username: string;
    /** 真实姓名 */
    realName?: string;
    /** 邮箱 */
    email?: string;
    /** 是否启用 */
    enabled: boolean;
  }

  /**
   * 角色用户分页结果
   */
  export interface RoleUsersPageResult {
    /** 用户数据列表 */
    pageData: User[];
    /** 总记录数 */
    total: number;
  }

  /**
   * 权限树节点
   */
  export interface PermissionTreeNode {
    /** 权限ID */
    id: number;
    /** 权限名称 */
    name: string;
    /** 权限编码 */
    code: string;
    /** 权限类型（MODULE/CATALOG/MENU/BUTTON） */
    type: string;
    /** 路由路径 */
    path?: string;
    /** 子权限列表 */
    children?: PermissionTreeNode[];
  }
}

// ==================== API 函数 ====================

/**
 * 创建角色
 *
 * 创建新的角色，需要提供角色名称和编码。
 * 角色编码必须唯一，创建后不可修改，用于系统内部标识角色。
 * 角色名称用于显示，可以包含中文。
 *
 * @param data 角色创建数据
 * @param data.name 角色名称（必填，1-50字符）
 * @param data.code 角色编码（必填，1-50字符，必须唯一）
 * @param data.description 角色描述（可选，最多200字符）
 * @param data.enabled 是否启用（可选，默认true）
 * @returns 创建成功的角色信息
 * @throws {Error} 当角色编码已存在时抛出错误
 * @throws {Error} 当参数验证失败时抛出错误
 *
 * @example
 * ```typescript
 * // 创建管理员角色
 * const role = await createRoleApi({
 *   name: '系统管理员',
 *   code: 'ADMIN',
 *   description: '拥有系统所有权限',
 *   enabled: true
 * });
 * ```
 *
 * @example
 * ```typescript
 * // 创建普通用户角色
 * const role = await createRoleApi({
 *   name: '普通用户',
 *   code: 'USER'
 * });
 * ```
 */
export async function createRoleApi(data: RoleApi.CreateRoleParams): Promise<RoleApi.Role> {
  return requestClient.post<RoleApi.Role>('/role', data);
}

/**
 * 查询所有角色
 *
 * 查询系统中的所有角色列表，不分页。
 * 可以通过启用状态筛选角色。
 * 此接口通常用于下拉选择器、角色分配等场景。
 *
 * @param params 查询参数
 * @param params.enabled 启用状态筛选（可选，true-只查询启用的角色）
 * @returns 角色列表
 * @throws {Error} 当查询失败时抛出错误
 *
 * @example
 * ```typescript
 * // 查询所有角色
 * const roles = await getAllRolesApi();
 * ```
 *
 * @example
 * ```typescript
 * // 只查询启用的角色
 * const enabledRoles = await getAllRolesApi({ enabled: true });
 * ```
 */
export async function getAllRolesApi(params?: { enabled?: boolean }): Promise<RoleApi.Role[]> {
  return requestClient.get<RoleApi.Role[]>('/role', { params });
}

/**
 * 分页查询角色
 *
 * 分页查询角色列表，支持多种筛选条件。
 * 可以按角色名称、编码、启用状态等条件筛选。
 * 返回的角色列表包含角色的基本信息。
 *
 * @param params 查询参数
 * @param params.page 页码（可选，从1开始，默认1）
 * @param params.pageSize 每页数量（可选，默认10）
 * @param params.name 角色名称（可选，模糊查询）
 * @param params.code 角色编码（可选，模糊查询）
 * @param params.enabled 启用状态（可选，true/false）
 * @returns 分页查询结果，包含角色列表和总数
 * @throws {Error} 当查询参数不合法时抛出错误
 *
 * @example
 * ```typescript
 * // 基本分页查询
 * const result = await getRolePageApi({
 *   page: 1,
 *   pageSize: 20
 * });
 * console.log(result.pageData); // 角色列表
 * console.log(result.total); // 总记录数
 * ```
 *
 * @example
 * ```typescript
 * // 带筛选条件的查询
 * const result = await getRolePageApi({
 *   page: 1,
 *   pageSize: 20,
 *   name: '管理员',
 *   enabled: true
 * });
 * ```
 */
export async function getRolePageApi(params: RoleApi.QueryRoleParams): Promise<RoleApi.PageResult> {
  return requestClient.get<RoleApi.PageResult>('/role/page', { params });
}

/**
 * 查询角色详情
 *
 * 根据角色ID查询角色的详细信息。
 * 返回的角色信息包含基本信息、关联的用户和权限列表。
 * 此接口通常用于角色详情页面或编辑角色时加载数据。
 *
 * @param id 角色ID
 * @returns 角色详细信息
 * @throws {Error} 当角色不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 查询角色详情
 * const role = await getRoleApi(1);
 * console.log(role.name);
 * console.log(role.users); // 关联的用户
 * console.log(role.permissions); // 关联的权限
 * ```
 */
export async function getRoleApi(id: number): Promise<RoleApi.Role> {
  return requestClient.get<RoleApi.Role>(`/role/${id}`);
}

/**
 * 更新角色
 *
 * 更新角色的基本信息，包括名称、编码、描述和启用状态。
 * 可以只更新部分字段，未提供的字段保持不变。
 * 角色编码更新时，新编码必须唯一。
 *
 * @param id 角色ID
 * @param data 更新数据
 * @param data.name 角色名称（可选，1-50字符）
 * @param data.code 角色编码（可选，1-50字符）
 * @param data.description 角色描述（可选，最多200字符）
 * @param data.enabled 是否启用（可选）
 * @returns 更新后的角色信息
 * @throws {Error} 当角色不存在时抛出错误
 * @throws {Error} 当角色编码已被占用时抛出错误
 *
 * @example
 * ```typescript
 * // 更新角色名称和描述
 * const role = await updateRoleApi(1, {
 *   name: '高级管理员',
 *   description: '拥有大部分管理权限'
 * });
 * ```
 *
 * @example
 * ```typescript
 * // 禁用角色
 * const role = await updateRoleApi(1, {
 *   enabled: false
 * });
 * ```
 */
export async function updateRoleApi(
  id: number,
  data: RoleApi.UpdateRoleParams
): Promise<RoleApi.Role> {
  return requestClient.request<RoleApi.Role>(`/role/${id}`, {
    method: 'PATCH',
    data,
  });
}

/**
 * 删除角色
 *
 * 删除指定的角色。
 * 删除操作不可恢复，请谨慎使用。
 * 如果角色已分配给用户，需要先取消分配才能删除。
 * 系统内置角色（如超级管理员）不能被删除。
 *
 * @param id 角色ID
 * @returns 删除是否成功
 * @throws {Error} 当角色不存在时抛出错误
 * @throws {Error} 当角色已分配给用户时抛出错误
 * @throws {Error} 当尝试删除系统内置角色时抛出错误
 *
 * @example
 * ```typescript
 * // 删除角色
 * const success = await deleteRoleApi(1);
 * if (success) {
 *   message.success('角色删除成功');
 *   // 刷新角色列表
 *   await fetchRoleList();
 * }
 * ```
 */
export async function deleteRoleApi(id: number): Promise<boolean> {
  return requestClient.delete<boolean>(`/role/${id}`);
}

/**
 * 查询角色权限
 *
 * 查询指定角色拥有的所有权限列表。
 * 返回的权限列表包含权限的完整信息，包括权限ID、名称、编码、类型等。
 * 此接口通常用于角色权限管理页面，展示角色已分配的权限。
 *
 * @param roleId 角色ID
 * @returns 角色拥有的权限列表
 * @throws {Error} 当角色不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 查询角色权限
 * const permissions = await getRolePermissionsApi(1);
 * console.log(permissions); // [{ id: 1, name: '用户管理', code: 'user:manage', ... }]
 * ```
 *
 * @example
 * ```typescript
 * // 在权限配置页面使用
 * const permissions = await getRolePermissionsApi(roleId);
 * const permissionIds = permissions.map(p => p.id);
 * // 用于初始化权限树的选中状态
 * ```
 */
export async function getRolePermissionsApi(roleId: number): Promise<RoleApi.PermissionTreeNode[]> {
  // 后端返回的是权限对象数组，不是ID数组
  return requestClient.get<RoleApi.PermissionTreeNode[]>('/role/permissions', {
    params: { id: roleId },
  });
}

/**
 * 为角色分配权限
 *
 * 为指定角色分配一组权限。
 * 此操作会覆盖角色原有的权限配置，而不是追加。
 * 如果需要保留原有权限，请先查询角色现有权限，然后合并新权限后再调用此接口。
 *
 * @param data 角色权限数据
 * @param data.id 角色ID
 * @param data.permissionIds 权限ID列表
 * @returns 分配是否成功
 * @throws {Error} 当角色不存在时抛出错误
 * @throws {Error} 当权限ID不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 为角色分配权限
 * const success = await addRolePermissionsApi({
 *   id: 1,
 *   permissionIds: [1, 2, 3, 4, 5]
 * });
 * if (success) {
 *   message.success('权限分配成功');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 保留原有权限并添加新权限
 * const existingPermissions = await getRolePermissionsApi(roleId);
 * const existingIds = existingPermissions.map(p => p.id);
 * const newIds = [6, 7, 8];
 * const allIds = [...new Set([...existingIds, ...newIds])];
 * 
 * await addRolePermissionsApi({
 *   id: roleId,
 *   permissionIds: allIds
 * });
 * ```
 */
export async function addRolePermissionsApi(data: RoleApi.RolePermissionsParams): Promise<boolean> {
  return requestClient.post<boolean>('/role/permissions/add', data);
}

/**
 * 查询当前角色权限树
 *
 * 查询当前登录用户所属角色的权限树结构。
 * 返回的权限树包含四层结构：模块(MODULE) -> 目录(CATALOG) -> 菜单(MENU) -> 按钮(BUTTON)。
 * 此接口通常用于构建系统菜单、权限控制等场景。
 *
 * @returns 权限树结构
 * @throws {Error} 当用户未登录时抛出错误
 *
 * @example
 * ```typescript
 * // 获取当前用户的权限树
 * const permissionTree = await getRolePermissionsTreeApi();
 * console.log(permissionTree);
 * // [
 * //   {
 * //     id: 1,
 * //     name: '系统管理',
 * //     type: 'MODULE',
 * //     children: [
 * //       {
 * //         id: 2,
 * //         name: '用户管理',
 * //         type: 'CATALOG',
 * //         children: [...]
 * //       }
 * //     ]
 * //   }
 * // ]
 * ```
 *
 * @example
 * ```typescript
 * // 用于构建动态菜单
 * const permissionTree = await getRolePermissionsTreeApi();
 * const menuItems = buildMenuFromPermissions(permissionTree);
 * ```
 */
export async function getRolePermissionsTreeApi(): Promise<RoleApi.PermissionTreeNode[]> {
  return requestClient.get<RoleApi.PermissionTreeNode[]>('/role/permissions/tree');
}

/**
 * 查询角色用户
 *
 * 查询指定角色下的所有用户信息。
 * 返回的角色信息中包含关联的用户列表。
 * 此接口通常用于角色用户管理页面，展示角色已分配的用户。
 *
 * @param roleId 角色ID
 * @returns 角色信息，包含用户列表
 * @throws {Error} 当角色不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 查询角色用户
 * const role = await getRoleUsersApi(1);
 * console.log(role.users); // [{ id: 1, username: 'admin' }, ...]
 * ```
 *
 * @example
 * ```typescript
 * // 统计角色用户数量
 * const role = await getRoleUsersApi(roleId);
 * const userCount = role.users?.length || 0;
 * console.log(`该角色有 ${userCount} 个用户`);
 * ```
 */
export async function getRoleUsersApi(roleId: number): Promise<RoleApi.Role> {
  return requestClient.get<RoleApi.Role>(`/role/${roleId}`, {
    params: { includeUsers: 'true' },
  });
}

/**
 * 分页查询角色用户
 *
 * 分页查询指定角色下的用户列表，支持按用户名、真实姓名筛选。
 * 此接口适用于角色用户较多的场景，避免一次性加载所有用户。
 * 返回的用户列表包含用户的基本信息和启用状态。
 *
 * @param params 查询参数
 * @param params.roleId 角色ID（必填）
 * @param params.pageNo 页码（可选，从1开始，默认1）
 * @param params.pageSize 每页数量（可选，默认10）
 * @param params.username 用户名（可选，模糊查询）
 * @param params.realName 真实姓名（可选，模糊查询）
 * @returns 分页查询结果，包含用户列表和总数
 * @throws {Error} 当角色不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 基本分页查询
 * const result = await getRoleUsersPageApi({
 *   roleId: 1,
 *   pageNo: 1,
 *   pageSize: 20
 * });
 * console.log(result.pageData); // 用户列表
 * console.log(result.total); // 总用户数
 * ```
 *
 * @example
 * ```typescript
 * // 按用户名筛选
 * const result = await getRoleUsersPageApi({
 *   roleId: 1,
 *   pageNo: 1,
 *   pageSize: 20,
 *   username: 'admin'
 * });
 * ```
 */
export async function getRoleUsersPageApi(params: RoleApi.QueryRoleUsersParams): Promise<RoleApi.RoleUsersPageResult> {
  const { roleId, ...queryParams } = params;
  return requestClient.get<RoleApi.RoleUsersPageResult>(`/role/users/${roleId}`, {
    params: queryParams,
  });
}

/**
 * 为角色分配用户
 *
 * 为指定角色分配一组用户。
 * 此操作会将用户添加到角色中，不会影响用户原有的其他角色。
 * 如果用户已经拥有该角色，则不会重复添加。
 *
 * @param roleId 角色ID
 * @param data 用户ID列表
 * @param data.userIds 要分配的用户ID数组
 * @returns 分配是否成功
 * @throws {Error} 当角色不存在时抛出错误
 * @throws {Error} 当用户ID不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 为角色分配用户
 * const success = await addRoleUsersApi(1, {
 *   userIds: [1, 2, 3, 4, 5]
 * });
 * if (success) {
 *   message.success('用户分配成功');
 *   // 刷新用户列表
 *   await fetchRoleUsers();
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 批量分配用户到管理员角色
 * const adminRoleId = 1;
 * const selectedUserIds = [10, 11, 12];
 * await addRoleUsersApi(adminRoleId, {
 *   userIds: selectedUserIds
 * });
 * ```
 */
export async function addRoleUsersApi(roleId: number, data: RoleApi.RoleUsersParams): Promise<boolean> {
  return requestClient.request<boolean>(`/role/users/add/${roleId}`, {
    method: 'PATCH',
    data,
  });
}

/**
 * 取消角色用户分配
 *
 * 从指定角色中移除一组用户。
 * 此操作只会移除用户的该角色，不会影响用户的其他角色。
 * 如果用户只有一个角色，移除后用户将没有任何角色。
 *
 * @param roleId 角色ID
 * @param data 用户ID列表
 * @param data.userIds 要移除的用户ID数组
 * @returns 移除是否成功
 * @throws {Error} 当角色不存在时抛出错误
 * @throws {Error} 当用户ID不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 从角色中移除用户
 * const success = await removeRoleUsersApi(1, {
 *   userIds: [1, 2, 3]
 * });
 * if (success) {
 *   message.success('用户移除成功');
 *   // 刷新用户列表
 *   await fetchRoleUsers();
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 批量移除用户
 * const roleId = 1;
 * const selectedUserIds = [10, 11, 12];
 * await removeRoleUsersApi(roleId, {
 *   userIds: selectedUserIds
 * });
 * ```
 */
export async function removeRoleUsersApi(roleId: number, data: RoleApi.RoleUsersParams): Promise<boolean> {
  return requestClient.request<boolean>(`/role/users/remove/${roleId}`, {
    method: 'PATCH',
    data,
  });
}
