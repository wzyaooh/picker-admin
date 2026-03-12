/**
 * 客户端菜单类型定义
 */

// 后端菜单类型（API 使用）
export type BackendMenuType = 'MODULE' | 'CATALOG' | 'MENU' | 'BUTTON';

// 前端菜单类型（表单使用）
export type FrontendMenuType = 'directory' | 'menu';

// 菜单记录类型
export type MenuRecord = {
  id: number;
  children?: MenuRecord[];
  component?: string;
  enable: boolean;
  hidden: boolean;
  icon?: string;
  moduleCode: string;
  order: number;
  parentId: number | null;
  path?: string;
  code?: string;
  name: string;
  type: BackendMenuType;
};

// 模块类型
export type Module = {
  id: number;
  name: string;
  code: string;
  order: number;
};
