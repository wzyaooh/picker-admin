import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';

// ==================== API 函数 ====================

/**
 * 获取用户所有菜单
 *
 * 获取当前登录用户有权限访问的所有菜单列表。
 * 返回的菜单数据包含路由配置信息，用于动态生成前端路由和菜单。
 * 菜单数据会根据用户的角色和权限进行过滤，只返回用户有权限访问的菜单。
 *
 * @returns 菜单路由配置列表
 * @throws {Error} 当用户未登录时抛出错误
 * @throws {Error} 当用户没有任何菜单权限时返回空数组
 *
 * @example
 * ```typescript
 * // 获取用户菜单
 * const menus = await getAllMenusApi();
 * console.log(menus); // 菜单路由配置数组
 * 
 * // 使用菜单数据生成路由
 * menus.forEach(menu => {
 *   router.addRoute(menu);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // 在应用初始化时加载菜单
 * async function initApp() {
 *   try {
 *     const menus = await getAllMenusApi();
 *     // 动态添加路由
 *     setupDynamicRoutes(menus);
 *     // 生成菜单树
 *     setupMenuTree(menus);
 *   } catch (error) {
 *     console.error('Failed to load menus:', error);
 *   }
 * }
 * ```
 */
export async function getAllMenusApi(): Promise<RouteRecordStringComponent[]> {
  return requestClient.get<RouteRecordStringComponent[]>('/menu/all');
}
