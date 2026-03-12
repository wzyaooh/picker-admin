import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getMenuTreeApi, getModulesApi } from '#/api/modules/menu';
import type { MenuApi } from '#/api/modules/menu';
import { useAccessStore } from '@vben/stores';
import type { MenuRecordRaw } from '@vben/types';

const MENU_CACHE_KEY = 'app_menu_cache';
const MENU_CACHE_TIME_KEY = 'app_menu_cache_time';
const SELECTED_MODULE_KEY = 'app_selected_module';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

export const useMenuStore = defineStore('menu', () => {
  // 状态
  const modules = ref<MenuApi.ModuleInfo[]>([]);
  const menuTree = ref<MenuApi.MenuTreeNode[]>([]);
  const selectedModuleCode = ref<string>('');
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 计算属性
  const currentModule = computed(() => {
    return modules.value.find((m) => m.code === selectedModuleCode.value);
  });

  const filteredMenuTree = computed(() => {
    console.log('filteredMenuTree computed:', {
      selectedModuleCode: selectedModuleCode.value,
      menuTreeLength: menuTree.value.length,
      menuTree: menuTree.value,
    });
    
    if (!selectedModuleCode.value) {
      return menuTree.value;
    }
    
    const filtered = menuTree.value.filter(
      (node) => node.code === selectedModuleCode.value,
    );
    
    console.log('filtered result:', filtered);
    return filtered;
  });

  /**
   * 将动态菜单树转换为路由菜单格式
   */
  function convertMenuTreeToRouterMenus(nodes: MenuApi.MenuTreeNode[]): MenuRecordRaw[] {
    if (!nodes || !Array.isArray(nodes)) {
      return [];
    }
    
    return nodes.flatMap((node) => {
      // 跳过 MODULE 类型，直接处理其子节点
      if (node.type === 'MODULE' && node.children) {
        return convertMenuTreeToRouterMenus(node.children);
      }

      // CATALOG 和 MENU 类型需要创建菜单项
      const menu: any = {
        name: node.name,
        path: node.path || `/${node.code}`,
        icon: node.icon,
        order: node.sort || node.order || 0,  // 兼容 sort 和 order 字段
        show: node.show !== undefined ? !!node.show : true,
      };

      // 组件路径（仅 MENU 类型需要）
      if (node.type === 'MENU' && node.component) {
        menu.component = node.component;
      }

      // 重定向（仅在有值时添加）
      if (node.redirect) {
        menu.redirect = node.redirect;
      }

      // meta 信息（仅在有 layout 或 keepAlive 时添加）
      if (node.layout || node.keepAlive !== undefined) {
        menu.meta = {
          ...(node.layout && { layout: node.layout }),
          ...(node.keepAlive !== undefined && { keepAlive: node.keepAlive }),
        };
      }

      // 递归处理子节点
      if (node.children && node.children.length > 0) {
        menu.children = convertMenuTreeToRouterMenus(node.children);
      }

      return [menu as MenuRecordRaw];
    });
  }

  /**
   * 更新 accessStore 的菜单数据
   */
  function updateAccessMenus() {
    const accessStore = useAccessStore();
    const menuTree = filteredMenuTree.value || [];
    const routerMenus = convertMenuTreeToRouterMenus(menuTree);
    // 过滤掉隐藏的菜单项
    const filterHidden = (menus: MenuRecordRaw[]): MenuRecordRaw[] => {
      return menus.filter((m) => {
        if (m.children) {
          m.children = filterHidden(m.children as MenuRecordRaw[]);
        }
        return m.show !== false;
      });
    };
    const visibleMenus = filterHidden(routerMenus);
    console.log('updateAccessMenus:', {
      filteredMenuTree: filteredMenuTree.value,
      routerMenus: visibleMenus,
    });
    accessStore.setAccessMenus(visibleMenus);
  }

  // 方法
  /**
   * 初始化菜单数据
   */
  async function initMenu() {
    loading.value = true;
    error.value = null;

    try {
      // 1. 尝试从缓存加载
      const cached = loadFromCache();
      if (cached) {
        modules.value = cached.modules;
        menuTree.value = cached.menuTree;

        // 后台刷新
        fetchMenuData().catch(console.error);
      } else {
        // 2. 从服务器获取
        await fetchMenuData();
      }

      // 3. 恢复选中的模块
      const savedModule = localStorage.getItem(SELECTED_MODULE_KEY);
      if (savedModule && modules.value.some((m) => m.code === savedModule)) {
        selectedModuleCode.value = savedModule;
      } else if (modules.value.length > 0) {
        selectedModuleCode.value = modules.value[0]?.code || '';
      }

      // 4. 更新 accessStore 的菜单
      updateAccessMenus();
    } catch (err: any) {
      error.value = err?.message || '加载菜单失败';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 从服务器获取菜单数据
   */
  async function fetchMenuData() {
    const [modulesData, menuTreeData] = await Promise.all([
      getModulesApi(),
      getMenuTreeApi(),
    ]);

    modules.value = modulesData;
    menuTree.value = menuTreeData;

    // 保存到缓存
    saveToCache({ modules: modulesData, menuTree: menuTreeData });
  }

  /**
   * 切换模块
   */
  function switchModule(moduleCode: string) {
    console.log('switchModule called:', moduleCode);
    selectedModuleCode.value = moduleCode;
    localStorage.setItem(SELECTED_MODULE_KEY, moduleCode);
    
    // 更新 accessStore 的菜单
    updateAccessMenus();
  }

  /**
   * 刷新菜单
   */
  async function refreshMenu() {
    await fetchMenuData();
    updateAccessMenus();
  }

  /**
   * 从缓存加载
   */
  function loadFromCache() {
    try {
      const cacheTime = localStorage.getItem(MENU_CACHE_TIME_KEY);
      if (!cacheTime) return null;

      const elapsed = Date.now() - Number(cacheTime);
      if (elapsed > CACHE_DURATION) {
        clearCache();
        return null;
      }

      const cached = localStorage.getItem(MENU_CACHE_KEY);
      if (!cached) return null;

      return JSON.parse(cached);
    } catch {
      clearCache();
      return null;
    }
  }

  /**
   * 保存到缓存
   */
  function saveToCache(data: any) {
    try {
      localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(MENU_CACHE_TIME_KEY, String(Date.now()));
    } catch (err) {
      console.error('保存菜单缓存失败:', err);
    }
  }

  /**
   * 清除缓存
   */
  function clearCache() {
    localStorage.removeItem(MENU_CACHE_KEY);
    localStorage.removeItem(MENU_CACHE_TIME_KEY);
  }

  /**
   * 重置菜单状态
   */
  function resetMenu() {
    modules.value = [];
    menuTree.value = [];
    selectedModuleCode.value = '';
    clearCache();
    localStorage.removeItem(SELECTED_MODULE_KEY);
  }

  /**
   * Pinia $reset 方法（setup 语法需要手动实现）
   */
  function $reset() {
    resetMenu();
  }

  return {
    // 状态
    modules,
    menuTree,
    selectedModuleCode,
    loading,
    error,
    // 计算属性
    currentModule,
    filteredMenuTree,
    // 方法
    initMenu,
    switchModule,
    refreshMenu,
    resetMenu,
    $reset,
  };
});
