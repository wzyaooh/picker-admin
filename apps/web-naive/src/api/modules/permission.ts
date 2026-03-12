import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================
export namespace PermissionApi {
  /** 权限类型 */
  export type PermissionType = 'API' | 'BUTTON' | 'CATALOG' | 'MENU' | 'MODULE';

  /** 权限节点 */
  export interface Permission {
    id: number;
    name: string;
    code: string;
    type: PermissionType;
    path?: string;
    icon?: string;
    component?: string;
    parentId?: number;
    order: number; // 后端字段名
    enable: boolean; // 后端字段名
    show: boolean; // 后端字段名
    description?: string;
    createdAt: string;
    updatedAt: string;
  }

  /** 创建权限参数 */
  export interface CreatePermissionParams {
    name: string;
    code: string;
    type: PermissionType;
    path?: string;
    redirect?: string;
    icon?: string;
    component?: string;
    layout?: string;
    keepAlive?: boolean;
    parentId?: number;
    order?: number;
    enable?: boolean;
    show?: boolean;
    description?: string;
  }

  /** 更新权限参数 */
  export interface UpdatePermissionParams {
    name?: string;
    code?: string;
    type?: PermissionType;
    path?: string;
    redirect?: string;
    icon?: string;
    component?: string;
    layout?: string;
    keepAlive?: boolean;
    parentId?: number;
    order?: number;
    enable?: boolean;
    show?: boolean;
    description?: string;
  }

  /** 权限树节点 */
  export interface PermissionTreeNode extends Permission {
    children?: PermissionTreeNode[];
  }
}

// ==================== API 函数 ====================

/**
 * 创建权限节点
 *
 * 创建一个新的权限节点，可以是模块、目录、菜单、按钮或API权限。
 * 权限节点采用树形结构，通过 parentId 指定父节点。
 * 权限编码必须唯一，用于系统内部标识权限。
 *
 * @param data 权限数据
 * @param data.name 权限名称（必填，1-50字符）
 * @param data.code 权限编码（必填，1-100字符，必须唯一）
 * @param data.type 权限类型（必填，MODULE/CATALOG/MENU/BUTTON/API）
 * @param data.path 路由路径（可选，菜单类型必填）
 * @param data.icon 图标（可选）
 * @param data.component 组件路径（可选，菜单类型必填）
 * @param data.parentId 父节点ID（可选，顶级节点不填）
 * @param data.order 排序号（可选，默认0）
 * @param data.enable 是否启用（可选，默认true）
 * @param data.show 是否显示（可选，默认true）
 * @param data.description 描述（可选，最多200字符）
 * @returns 创建成功的权限信息
 * @throws {Error} 当权限编码已存在时抛出错误
 * @throws {Error} 当父节点不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 创建模块权限
 * const module = await createPermissionApi({
 *   name: '系统管理',
 *   code: 'system',
 *   type: 'MODULE',
 *   icon: 'settings',
 *   order: 1
 * });
 * ```
 *
 * @example
 * ```typescript
 * // 创建菜单权限
 * const menu = await createPermissionApi({
 *   name: '用户管理',
 *   code: 'system:user',
 *   type: 'MENU',
 *   path: '/system/user',
 *   component: 'views/system/user/index.vue',
 *   parentId: 1,
 *   icon: 'user',
 *   order: 1
 * });
 * ```
 */
export async function createPermissionApi(
  data: PermissionApi.CreatePermissionParams,
): Promise<PermissionApi.Permission> {
  return requestClient.post<PermissionApi.Permission>('/permission', data);
}

/**
 * 批量创建权限节点
 *
 * 批量创建多个权限节点，适用于初始化权限数据或批量导入场景。
 * 所有权限节点的编码必须唯一，如果有任何一个编码重复，整个批量操作将失败。
 * 建议按照层级顺序创建，先创建父节点，再创建子节点。
 *
 * @param data 权限数据数组
 * @returns 创建成功的权限列表
 * @throws {Error} 当任何权限编码已存在时抛出错误
 * @throws {Error} 当参数验证失败时抛出错误
 *
 * @example
 * ```typescript
 * // 批量创建权限
 * const permissions = await batchCreatePermissionApi([
 *   {
 *     name: '系统管理',
 *     code: 'system',
 *     type: 'MODULE',
 *     order: 1
 *   },
 *   {
 *     name: '用户管理',
 *     code: 'system:user',
 *     type: 'CATALOG',
 *     parentId: 1,
 *     order: 1
 *   },
 *   {
 *     name: '用户列表',
 *     code: 'system:user:list',
 *     type: 'MENU',
 *     path: '/system/user',
 *     component: 'views/system/user/index.vue',
 *     parentId: 2,
 *     order: 1
 *   }
 * ]);
 * console.log(`成功创建 ${permissions.length} 个权限`);
 * ```
 */
export async function batchCreatePermissionApi(
  data: PermissionApi.CreatePermissionParams[],
): Promise<PermissionApi.Permission[]> {
  return requestClient.post<PermissionApi.Permission[]>(
    '/permission/batch',
    data,
  );
}

/**
 * 查询所有权限（扁平列表）
 *
 * 查询系统中的所有权限节点，返回扁平列表结构。
 * 包含所有类型的权限：模块、目录、菜单、按钮、API。
 * 此接口通常用于权限选择器、权限搜索等场景。
 *
 * @returns 权限列表（扁平结构）
 * @throws {Error} 当查询失败时抛出错误
 *
 * @example
 * ```typescript
 * // 查询所有权限
 * const permissions = await getAllPermissionsApi();
 * console.log(`共有 ${permissions.length} 个权限`);
 * ```
 *
 * @example
 * ```typescript
 * // 筛选菜单类型的权限
 * const permissions = await getAllPermissionsApi();
 * const menus = permissions.filter(p => p.type === 'MENU');
 * ```
 */
export async function getAllPermissionsApi(): Promise<
  PermissionApi.Permission[]
> {
  return requestClient.get<PermissionApi.Permission[]>('/permission');
}

/**
 * 查询完整权限树（四层结构）
 *
 * 查询系统中的完整权限树结构，包含四层：
 * 1. 模块(MODULE) - 顶层分组
 * 2. 目录(CATALOG) - 二级分组
 * 3. 菜单(MENU) - 具体页面
 * 4. 按钮(BUTTON) - 页面操作
 *
 * 此接口通常用于权限树展示、权限分配、菜单构建等场景。
 *
 * @returns 权限树结构
 * @throws {Error} 当查询失败时抛出错误
 *
 * @example
 * ```typescript
 * // 查询权限树
 * const tree = await getPermissionTreeApi();
 * console.log(tree);
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
 * // 用于权限树组件
 * const tree = await getPermissionTreeApi();
 * // 渲染到 NTree 组件
 * ```
 */
export async function getPermissionTreeApi(): Promise<
  PermissionApi.PermissionTreeNode[]
> {
  return requestClient.get<PermissionApi.PermissionTreeNode[]>(
    '/permission/tree',
  );
}

/**
 * 查询权限详情
 *
 * 根据权限ID查询权限的详细信息。
 * 返回的权限信息包含所有字段，包括名称、编码、类型、路径、图标等。
 * 此接口通常用于权限详情页面或编辑权限时加载数据。
 *
 * @param id 权限ID
 * @returns 权限详细信息
 * @throws {Error} 当权限不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 查询权限详情
 * const permission = await getPermissionApi(1);
 * console.log(permission.name);
 * console.log(permission.code);
 * console.log(permission.type);
 * ```
 *
 * @example
 * ```typescript
 * // 编辑权限时加载数据
 * const permission = await getPermissionApi(permissionId);
 * formData.value = { ...permission };
 * ```
 */
export async function getPermissionApi(
  id: number,
): Promise<PermissionApi.Permission> {
  return requestClient.get<PermissionApi.Permission>(`/permission/${id}`);
}

/**
 * 更新权限节点
 *
 * 更新权限节点的信息，可以只更新部分字段。
 * 权限编码更新时，新编码必须唯一。
 * 更新父节点时，不能将节点设置为自己的子节点（避免循环引用）。
 *
 * @param id 权限ID
 * @param data 更新数据
 * @param data.name 权限名称（可选，1-50字符）
 * @param data.code 权限编码（可选，1-100字符）
 * @param data.type 权限类型（可选）
 * @param data.path 路由路径（可选）
 * @param data.icon 图标（可选）
 * @param data.component 组件路径（可选）
 * @param data.parentId 父节点ID（可选）
 * @param data.order 排序号（可选）
 * @param data.enable 是否启用（可选）
 * @param data.show 是否显示（可选）
 * @param data.description 描述（可选）
 * @returns 更新后的权限信息
 * @throws {Error} 当权限不存在时抛出错误
 * @throws {Error} 当权限编码已被占用时抛出错误
 * @throws {Error} 当父节点设置不合法时抛出错误
 *
 * @example
 * ```typescript
 * // 更新权限名称和图标
 * const permission = await updatePermissionApi(1, {
 *   name: '用户管理（新）',
 *   icon: 'user-circle'
 * });
 * ```
 *
 * @example
 * ```typescript
 * // 禁用权限
 * const permission = await updatePermissionApi(1, {
 *   enable: false
 * });
 * ```
 */
export async function updatePermissionApi(
  id: number,
  data: PermissionApi.UpdatePermissionParams,
): Promise<PermissionApi.Permission> {
  return requestClient.patch<PermissionApi.Permission>(
    `/permission/${id}`,
    data,
  );
}

/**
 * 删除权限节点
 *
 * 删除指定的权限节点。
 * 删除操作不可恢复，请谨慎使用。
 * 如果权限节点有子节点，需要先删除所有子节点才能删除父节点。
 * 如果权限已分配给角色，需要先取消分配才能删除。
 *
 * @param id 权限ID
 * @returns 删除是否成功
 * @throws {Error} 当权限不存在时抛出错误
 * @throws {Error} 当权限有子节点时抛出错误
 * @throws {Error} 当权限已分配给角色时抛出错误
 *
 * @example
 * ```typescript
 * // 删除权限
 * const success = await deletePermissionApi(1);
 * if (success) {
 *   message.success('权限删除成功');
 *   // 刷新权限树
 *   await fetchPermissionTree();
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 删除前确认
 * dialog.warning({
 *   title: '确认删除',
 *   content: '删除权限后不可恢复，确定要删除吗？',
 *   positiveText: '确定',
 *   onPositiveClick: async () => {
 *     await deletePermissionApi(permissionId);
 *     message.success('删除成功');
 *   }
 * });
 * ```
 */
export async function deletePermissionApi(id: number): Promise<boolean> {
  return requestClient.delete<boolean>(`/permission/${id}`);
}

/**
 * 查询指定父节点下的按钮权限
 *
 * 查询指定菜单节点下的所有按钮权限。
 * 按钮权限用于控制页面上的操作按钮（如新增、编辑、删除等）。
 * 此接口通常用于动态渲染页面按钮、权限控制等场景。
 *
 * @param parentId 父节点ID（菜单ID）
 * @returns 按钮权限列表
 * @throws {Error} 当父节点不存在时抛出错误
 *
 * @example
 * ```typescript
 * // 查询用户管理页面的按钮权限
 * const buttons = await getButtonPermissionsApi(10);
 * console.log(buttons);
 * // [
 * //   { id: 11, name: '新增', code: 'user:create', type: 'BUTTON' },
 * //   { id: 12, name: '编辑', code: 'user:edit', type: 'BUTTON' },
 * //   { id: 13, name: '删除', code: 'user:delete', type: 'BUTTON' }
 * // ]
 * ```
 *
 * @example
 * ```typescript
 * // 用于动态渲染按钮
 * const buttons = await getButtonPermissionsApi(menuId);
 * const hasCreatePermission = buttons.some(b => b.code === 'user:create');
 * ```
 */
export async function getButtonPermissionsApi(
  parentId: number,
): Promise<PermissionApi.Permission[]> {
  return requestClient.get<PermissionApi.Permission[]>(
    `/permission/button/${parentId}`,
  );
}

/**
 * 清理权限缓存
 *
 * 清理后端 Redis 中的权限缓存数据。
 * 当权限数据发生变化但缓存未及时更新时，可以手动清理缓存。
 * 此接口通常用于调试或数据同步问题的解决。
 *
 * @returns 清理结果
 * @throws {Error} 当清理失败时抛出错误
 *
 * @example
 * ```typescript
 * // 清理权限缓存
 * const result = await clearPermissionCacheApi();
 * if (result.success) {
 *   message.success('缓存清理成功');
 *   // 重新加载权限数据
 *   await fetchPermissionTree();
 * }
 * ```
 */
export async function clearPermissionCacheApi(): Promise<{
  success: boolean;
  message: string;
}> {
  return requestClient.post<{ success: boolean; message: string }>(
    '/permission/cache/clear',
  );
}

/**
 * 校验菜单路径是否存在
 *
 * 校验指定的菜单路径是否已被使用。
 * 菜单路径必须唯一，不能重复。
 * 此接口通常用于创建或编辑菜单时，实时校验路径是否可用。
 *
 * @param path 菜单路径（如：/system/user）
 * @returns true-路径已存在，false-路径可用
 * @throws {Error} 当参数不合法时抛出错误
 *
 * @example
 * ```typescript
 * // 校验路径是否可用
 * const exists = await validateMenuPathApi('/system/user');
 * if (exists) {
 *   message.error('该路径已被使用，请使用其他路径');
 * } else {
 *   message.success('路径可用');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 在表单中实时校验
 * const pathInput = ref('');
 *
 * watch(pathInput, async (newPath) => {
 *   if (newPath) {
 *     const exists = await validateMenuPathApi(newPath);
 *     if (exists) {
 *       pathError.value = '路径已存在';
 *     } else {
 *       pathError.value = '';
 *     }
 *   }
 * });
 * ```
 */
export async function validateMenuPathApi(path: string): Promise<boolean> {
  return requestClient.get<boolean>('/permission/menu/validate', {
    params: { path },
  });
}
