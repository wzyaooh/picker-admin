import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
  RouteRecordStringComponent,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';

import { message } from '#/adapter/naive';
import { getMenuTreeApi, type MenuApi } from '#/api/modules/menu';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

/**
 * 将动态菜单树转换为路由菜单格式
 * @param nodes 菜单树节点
 * @param isTopLevel 是否为顶级节点（MODULE 的直接子节点）
 */
function convertMenuTreeToRouterMenus(nodes: MenuApi.MenuTreeNode[], isTopLevel = true): RouteRecordStringComponent[] {
  if (!nodes || !Array.isArray(nodes)) {
    return [];
  }
  
  return nodes.flatMap((node) => {
    // 跳过 MODULE 类型，直接处理其子节点（子节点为顶级）
    if (node.type === 'MODULE' && node.children) {
      return convertMenuTreeToRouterMenus(node.children, true);
    }

    // 处理 component 路径
    let component: string | undefined;
    if (node.type === 'CATALOG') {
      // 只有顶级 CATALOG 使用 BasicLayout，嵌套 CATALOG 不设 component
      component = isTopLevel ? 'BasicLayout' : undefined;
    } else if (node.type === 'MENU') {
      // 菜单类型使用配置的 component，如果为空则使用 BasicLayout
      component = node.component || 'BasicLayout';
    } else {
      // 其他类型（如 BUTTON）使用 BasicLayout
      component = 'BasicLayout';
    }

    const menu: RouteRecordStringComponent = {
      name: node.code || node.name,
      path: node.path || `/${node.code}`,
      ...(component ? { component } : {}),
      meta: {
        icon: node.icon,
        order: node.sort || node.order || 0,  // 兼容 sort 和 order 字段
        title: node.name,
        ...(node.show !== undefined && !node.show && { hideInMenu: true }),
        ...(node.layout && { layout: node.layout }),
        ...(node.keepAlive !== undefined && { keepAlive: node.keepAlive }),
      },
    };

    // 重定向（仅在有值时添加）
    if (node.redirect) {
      (menu as any).redirect = node.redirect;
    }

    if (node.children && node.children.length > 0) {
      menu.children = convertMenuTreeToRouterMenus(node.children, false);
    }

    return [menu];
  });
}

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      message.loading(`${$t('common.loadingMenu')}...`, {
        duration: 1.5,
      });
      
      // 使用新的菜单树 API
      const menuTree = await getMenuTreeApi();
      
      // 转换为路由格式
      const routes = convertMenuTreeToRouterMenus(menuTree);
      
      return routes;
    },
    // 可以指定没有权限跳转403页面
    forbiddenComponent,
    // 如果 route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
