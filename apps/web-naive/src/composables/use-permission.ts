import { computed } from 'vue';
import { useAccessStore } from '@vben/stores';
import { useUserStore } from '@vben/stores';

/**
 * 权限检查 Composable
 *
 * 提供权限码检查、角色检查等功能。
 * 支持单个权限、多个权限（AND/OR）、角色检查等。
 *
 * 功能特性：
 * - 单个权限检查
 * - 多个权限检查（AND 逻辑）
 * - 任一权限检查（OR 逻辑）
 * - 角色检查
 * - 超级管理员检查
 *
 * @returns 权限检查相关的方法和状态
 *
 * @example
 * ```typescript
 * // 基本使用
 * const { hasPermission, hasRole, hasAnyPermission } = usePermission();
 *
 * // 检查单个权限
 * if (hasPermission('user:create')) {
 *   // 有权限
 * }
 *
 * // 检查多个权限（AND）
 * if (hasPermission(['user:create', 'user:edit'])) {
 *   // 同时拥有两个权限
 * }
 *
 * // 检查多个权限（OR）
 * if (hasAnyPermission(['user:create', 'user:edit'])) {
 *   // 拥有任一权限
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 在模板中使用
 * <template>
 *   <NButton v-if="hasPermission('user:create')" @click="handleCreate">
 *     新增用户
 *   </NButton>
 *
 *   <NButton v-if="hasRole('ADMIN')" @click="handleAdminAction">
 *     管理员操作
 *   </NButton>
 * </template>
 * ```
 *
 * @example
 * ```typescript
 * // 完整示例
 * const {
 *   permissions,
 *   roles,
 *   hasPermission,
 *   hasAnyPermission,
 *   hasRole,
 *   isSuperAdmin,
 * } = usePermission();
 *
 * // 检查权限
 * if (hasPermission('user:delete')) {
 *   console.log('可以删除用户');
 * }
 *
 * // 检查角色
 * if (hasRole('ADMIN')) {
 *   console.log('是管理员');
 * }
 *
 * // 检查是否是超级管理员
 * if (isSuperAdmin()) {
 *   console.log('是超级管理员，拥有所有权限');
 * }
 * ```
 */
export function usePermission() {
  const accessStore = useAccessStore();
  const userStore = useUserStore();

  /** 权限码列表 */
  const permissions = computed(() => accessStore.accessCodes || []);

  /** 角色列表（从用户信息中获取） */
  const roles = computed(() => {
    const userInfo = userStore.userInfo;
    if (!userInfo || !userInfo.roles) return [];
    return userInfo.roles.map((role: any) => role.code || role);
  });

  /**
   * 检查是否有权限
   *
   * 支持单个权限码或权限码数组。
   * 如果传入数组，需要同时拥有所有权限（AND 逻辑）。
   *
   * @param permission 权限码或权限码数组
   * @returns 是否有权限
   *
   * @example
   * ```typescript
   * // 检查单个权限
   * if (hasPermission('user:create')) {
   *   console.log('有创建用户权限');
   * }
   * ```
   *
   * @example
   * ```typescript
   * // 检查多个权限（AND）
   * if (hasPermission(['user:create', 'user:edit'])) {
   *   console.log('同时拥有创建和编辑权限');
   * }
   * ```
   */
  function hasPermission(permission: string | string[]): boolean {
    if (!permission) return true;

    // 超级管理员拥有所有权限
    if (isSuperAdmin()) return true;

    if (Array.isArray(permission)) {
      // 数组：需要同时拥有所有权限（AND）
      return permission.every((p) => permissions.value.includes(p));
    }

    // 字符串：检查单个权限
    return permissions.value.includes(permission);
  }

  /**
   * 检查是否有任一权限
   *
   * 只要拥有权限列表中的任意一个权限即可（OR 逻辑）。
   *
   * @param permissionList 权限码数组
   * @returns 是否有任一权限
   *
   * @example
   * ```typescript
   * // 检查是否有任一权限
   * if (hasAnyPermission(['user:create', 'user:edit', 'user:delete'])) {
   *   console.log('至少拥有一个用户管理权限');
   * }
   * ```
   */
  function hasAnyPermission(permissionList: string[]): boolean {
    if (!permissionList || permissionList.length === 0) return true;

    // 超级管理员拥有所有权限
    if (isSuperAdmin()) return true;

    return permissionList.some((p) => permissions.value.includes(p));
  }

  /**
   * 检查是否有角色
   *
   * 支持单个角色码或角色码数组。
   * 如果传入数组，需要同时拥有所有角色（AND 逻辑）。
   *
   * @param role 角色码或角色码数组
   * @returns 是否有角色
   *
   * @example
   * ```typescript
   * // 检查单个角色
   * if (hasRole('ADMIN')) {
   *   console.log('是管理员');
   * }
   * ```
   *
   * @example
   * ```typescript
   * // 检查多个角色（AND）
   * if (hasRole(['ADMIN', 'MANAGER'])) {
   *   console.log('同时拥有管理员和经理角色');
   * }
   * ```
   */
  function hasRole(role: string | string[]): boolean {
    if (!role) return true;

    if (Array.isArray(role)) {
      // 数组：需要同时拥有所有角色（AND）
      return role.every((r) => roles.value.includes(r));
    }

    // 字符串：检查单个角色
    return roles.value.includes(role);
  }

  /**
   * 检查是否有任一角色
   *
   * 只要拥有角色列表中的任意一个角色即可（OR 逻辑）。
   *
   * @param roleList 角色码数组
   * @returns 是否有任一角色
   *
   * @example
   * ```typescript
   * // 检查是否有任一角色
   * if (hasAnyRole(['ADMIN', 'MANAGER', 'OPERATOR'])) {
   *   console.log('至少拥有一个管理角色');
   * }
   * ```
   */
  function hasAnyRole(roleList: string[]): boolean {
    if (!roleList || roleList.length === 0) return true;
    return roleList.some((r) => roles.value.includes(r));
  }

  /**
   * 检查是否是超级管理员
   *
   * 超级管理员拥有所有权限，无需检查具体权限码。
   *
   * @returns 是否是超级管理员
   *
   * @example
   * ```typescript
   * // 检查是否是超级管理员
   * if (isSuperAdmin()) {
   *   console.log('是超级管理员，拥有所有权限');
   *   // 显示所有功能
   * }
   * ```
   */
  function isSuperAdmin(): boolean {
    return roles.value.includes('SUPER_ADMIN');
  }

  /**
   * 检查是否有权限或角色
   *
   * 同时检查权限码和角色，只要满足其中一个条件即可。
   * 常用于需要同时支持权限和角色控制的场景。
   *
   * @param permission 权限码或权限码数组
   * @param role 角色码或角色码数组
   * @returns 是否有权限或角色
   *
   * @example
   * ```typescript
   * // 检查是否有权限或角色
   * if (hasPermissionOrRole('user:delete', 'ADMIN')) {
   *   console.log('有删除权限或是管理员');
   * }
   * ```
   */
  function hasPermissionOrRole(
    permission: string | string[],
    role: string | string[]
  ): boolean {
    return hasPermission(permission) || hasRole(role);
  }

  /**
   * 检查是否同时有权限和角色
   *
   * 同时检查权限码和角色，需要同时满足两个条件。
   *
   * @param permission 权限码或权限码数组
   * @param role 角色码或角色码数组
   * @returns 是否同时有权限和角色
   *
   * @example
   * ```typescript
   * // 检查是否同时有权限和角色
   * if (hasPermissionAndRole('user:delete', 'ADMIN')) {
   *   console.log('既有删除权限又是管理员');
   * }
   * ```
   */
  function hasPermissionAndRole(
    permission: string | string[],
    role: string | string[]
  ): boolean {
    return hasPermission(permission) && hasRole(role);
  }

  return {
    /** 权限码列表 */
    permissions,
    /** 角色列表 */
    roles,
    /** 检查是否有权限 */
    hasPermission,
    /** 检查是否有任一权限 */
    hasAnyPermission,
    /** 检查是否有角色 */
    hasRole,
    /** 检查是否有任一角色 */
    hasAnyRole,
    /** 检查是否是超级管理员 */
    isSuperAdmin,
    /** 检查是否有权限或角色 */
    hasPermissionOrRole,
    /** 检查是否同时有权限和角色 */
    hasPermissionAndRole,
  };
}
