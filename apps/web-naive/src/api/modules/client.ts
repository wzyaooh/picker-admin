import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================
export namespace ClientApi {
  /** 菜单类型 */
  export type MenuType = 'MODULE' | 'CATALOG' | 'MENU' | 'BUTTON';

  /** 客户端模块 */
  export interface Module {
    id: number;
    name: string;
    code: string;
    description?: string;
    enable: boolean;
    createdAt: string;
    updatedAt: string;
  }

  /** 客户端菜单 */
  export interface Menu {
    id: number;
    moduleCode: string;
    parentId: number | null;
    name: string;
    type: MenuType;
    path?: string;
    icon?: string;
    component?: string;
    code: string;
    hidden: boolean;
    enable: boolean;
    order: number;
    createdAt: string;
    updatedAt: string;
    children?: Menu[];
  }

  /** 创建模块参数 */
  export interface CreateModuleParams {
    name: string;
    code: string;
    description?: string;
    enable?: boolean;
  }

  /** 更新模块参数 */
  export interface UpdateModuleParams {
    name?: string;
    code?: string;
    description?: string;
    enable?: boolean;
  }

  /** 查询模块参数 */
  export interface QueryModuleParams {
    pageNo?: number;
    pageSize?: number;
    keyword?: string;
  }

  /** 模块分页结果 */
  export interface ModulePageResult {
    pageData: Module[];
    total: number;
  }

  /** 创建菜单参数 */
  export interface CreateMenuParams {
    moduleCode: string;
    parentId?: number;
    name: string;
    type: MenuType;
    path?: string;
    icon?: string;
    component?: string;
    code: string;
    hidden?: boolean;
    enable?: boolean;
    order?: number;
  }

  /** 更新菜单参数 */
  export interface UpdateMenuParams {
    moduleCode?: string;
    parentId?: number;
    name?: string;
    type?: MenuType;
    path?: string;
    icon?: string;
    component?: string;
    code?: string;
    hidden?: boolean;
    enable?: boolean;
    order?: number;
  }

  /** 查询菜单参数 */
  export interface QueryMenuParams {
    moduleCode?: string;
    keyword?: string;
  }
}

// ==================== 模块管理 API ====================

/**
 * 创建客户端模块
 * @param data 模块数据
 */
export async function createClientModuleApi(data: ClientApi.CreateModuleParams) {
  return requestClient.post<ClientApi.Module>('/client/module', data);
}

/**
 * 查询客户端模块列表
 * @param params 查询参数
 */
export async function getClientModulesApi(params?: ClientApi.QueryModuleParams) {
  return requestClient.get<ClientApi.ModulePageResult>('/client/module', { params });
}

/**
 * 查询客户端模块列表（别名）
 * @param params 查询参数
 */
export async function getClientModuleListApi(params?: ClientApi.QueryModuleParams) {
  return requestClient.get<ClientApi.ModulePageResult>('/client/module', { params });
}

/**
 * 查询客户端模块详情
 * @param id 模块ID
 */
export async function getClientModuleApi(id: number) {
  return requestClient.get<ClientApi.Module>(`/client/module/${id}`);
}

/**
 * 更新客户端模块
 * @param id 模块ID
 * @param data 更新数据
 */
export async function updateClientModuleApi(
  id: number,
  data: ClientApi.UpdateModuleParams,
) {
  return requestClient.patch<ClientApi.Module>(`/client/module/${id}`, data);
}

/**
 * 删除客户端模块
 * @param id 模块ID
 */
export async function deleteClientModuleApi(id: number) {
  return requestClient.delete<boolean>(`/client/module/${id}`);
}

// ==================== 菜单管理 API ====================

/**
 * 创建客户端菜单
 * @param data 菜单数据
 */
export async function createClientMenuApi(data: ClientApi.CreateMenuParams) {
  return requestClient.post<ClientApi.Menu>('/client/menu', data);
}

/**
 * 批量创建客户端菜单
 * @param data 菜单数据数组
 */
export async function batchCreateClientMenuApi(data: ClientApi.CreateMenuParams[]) {
  return requestClient.post<ClientApi.Menu[]>('/client/menu/batch', data);
}

/**
 * 查询客户端菜单树
 * @param params 查询参数
 */
export async function getClientMenuTreeApi(params?: ClientApi.QueryMenuParams) {
  return requestClient.get<ClientApi.Menu[]>('/client/menu/tree', { params });
}

/**
 * 查询客户端菜单详情
 * @param id 菜单ID
 */
export async function getClientMenuApi(id: number) {
  return requestClient.get<ClientApi.Menu>(`/client/menu/${id}`);
}

/**
 * 更新客户端菜单
 * @param id 菜单ID
 * @param data 更新数据
 */
export async function updateClientMenuApi(
  id: number,
  data: ClientApi.UpdateMenuParams,
) {
  return requestClient.patch<ClientApi.Menu>(`/client/menu/${id}`, data);
}

/**
 * 删除客户端菜单
 * @param id 菜单ID
 */
export async function deleteClientMenuApi(id: number) {
  return requestClient.delete<boolean>(`/client/menu/${id}`);
}

/**
 * 查询菜单的按钮权限
 * @param menuId 菜单ID
 */
export async function getClientMenuButtonsApi(menuId: number) {
  return requestClient.get<ClientApi.Menu[]>(`/client/menu/button/${menuId}`);
}
