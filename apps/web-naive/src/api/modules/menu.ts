import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================
export namespace MenuApi {
  /** 菜单树节点 */
  export interface MenuTreeNode {
    id: number;
    name: string;
    code: string;
    type: 'MODULE' | 'CATALOG' | 'MENU';
    path?: string;
    icon?: string;
    sort?: number;  // 后端返回的字段名
    order?: number;  // 兼容字段
    parentId?: number;
    /** 组件路径（相对于 views 目录） */
    component?: string;
    /** 布局组件 */
    layout?: string;
    /** 重定向路径 */
    redirect?: string;
    /** 是否缓存页面 */
    keepAlive?: boolean;
    /** 是否在菜单中显示 */
    show?: boolean;
    children: MenuTreeNode[];
  }

  /** 模块信息 */
  export interface ModuleInfo {
    id: number;
    name: string;
    code: string;
    icon?: string;
    sort?: number;  // 后端返回的字段名
    order?: number;  // 兼容字段
  }

  /** 查询参数 */
  export interface QueryParams {
    moduleCode?: string;
  }

  /** 路径验证参数 */
  export interface ValidatePathParams {
    path: string;
    id?: number;
  }
}

// ==================== API 函数 ====================

/**
 * 获取菜单树
 * @param params 查询参数
 */
export async function getMenuTreeApi(params?: MenuApi.QueryParams) {
  return requestClient.get<MenuApi.MenuTreeNode[]>(
    '/permission/menu/tree',
    { params },
  );
}

/**
 * 获取所有模块
 */
export async function getModulesApi() {
  return requestClient.get<MenuApi.ModuleInfo[]>('/permission/modules');
}

/**
 * 验证菜单路径
 * @param path 菜单路径
 * @param id 可选的菜单ID
 */
export async function validateMenuPathApi(path: string, id?: number) {
  return requestClient.get<boolean>('/permission/menu/validate', {
    params: { path, id },
  });
}
