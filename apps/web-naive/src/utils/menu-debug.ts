/**
 * 菜单调试工具
 * 在浏览器控制台使用: window.debugMenu()
 */

import { useMenuStore } from '#/store/menu';
import { useAccessStore } from '@vben/stores';

export function debugMenu() {
  console.group('🔍 菜单调试信息');

  // 1. 菜单 Store
  const menuStore = useMenuStore();
  console.group('📦 Menu Store');
  console.log('模块列表:', menuStore.modules);
  console.log('菜单树:', menuStore.menuTree);
  console.log('选中的模块:', menuStore.selectedModuleCode);
  console.log('当前模块:', menuStore.currentModule);
  console.log('过滤后的菜单树:', menuStore.filteredMenuTree);
  console.log('加载状态:', menuStore.loading);
  console.log('错误信息:', menuStore.error);
  console.groupEnd();

  // 2. Access Store
  const accessStore = useAccessStore();
  console.group('🔐 Access Store');
  console.log('访问菜单:', accessStore.accessMenus);
  console.log('访问路由:', accessStore.accessRoutes);
  console.groupEnd();

  // 3. 路由信息
  if (window.$router) {
    console.group('🛣️ 路由信息');
    const allRoutes = window.$router.getRoutes();
    console.log('总路由数:', allRoutes.length);
    console.table(
      allRoutes.map((r) => ({
        name: r.name,
        path: r.path,
        component: r.components?.default?.name || 'Unknown',
      }))
    );
    console.groupEnd();
  }

  // 4. 菜单路径检查
  console.group('📍 菜单路径检查');
  const checkMenuPaths = (menus: any[], level = 0) => {
    menus.forEach((menu) => {
      const indent = '  '.repeat(level);
      console.log(
        `${indent}${menu.name}:`,
        `path=${menu.path}`,
        `component=${menu.component || 'N/A'}`,
        `type=${menu.type || 'N/A'}`
      );
      if (menu.children && menu.children.length > 0) {
        checkMenuPaths(menu.children, level + 1);
      }
    });
  };
  checkMenuPaths(menuStore.filteredMenuTree);
  console.groupEnd();

  // 5. 路由匹配测试
  if (window.$router) {
    console.group('🎯 路由匹配测试');
    const testPaths = [
      '/dashboard/analytics',
      '/dashboard/workspace',
      '/organization/user',
      '/permission/menu',
      '/client/module',
    ];

    testPaths.forEach((path) => {
      const route = window.$router.resolve(path);
      const matched = route.matched.length > 0;
      console.log(
        `${matched ? '✅' : '❌'} ${path}:`,
        matched ? '路由存在' : '路由不存在'
      );
      if (matched) {
        console.log('  匹配的路由:', route.matched[0]?.name);
        console.log('  组件:', route.matched[0]?.components?.default?.name);
      }
    });
    console.groupEnd();
  }

  // 6. LocalStorage 检查
  console.group('💾 LocalStorage');
  console.log('菜单缓存:', localStorage.getItem('app_menu_cache'));
  console.log('缓存时间:', localStorage.getItem('app_menu_cache_time'));
  console.log('选中模块:', localStorage.getItem('app_selected_module'));
  console.groupEnd();

  console.groupEnd();

  return {
    menuStore,
    accessStore,
    router: window.$router,
  };
}

// 挂载到 window 对象
if (typeof window !== 'undefined') {
  (window as any).debugMenu = debugMenu;
}
