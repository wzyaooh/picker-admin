<script setup lang="ts">
/**
 * 动态菜单组件
 *
 * 根据用户权限和选中的模块动态渲染菜单树。
 * 支持多级菜单、图标显示、路由跳转、激活状态等功能。
 * 菜单数据从 MenuStore 获取，会根据模块切换自动更新。
 *
 * 功能特性：
 * - 自动根据当前路由高亮激活菜单项
 * - 支持图标显示（使用 Iconify）
 * - 支持多级菜单展开/折叠
 * - 点击菜单项自动进行路由跳转
 * - 监听模块切换，自动更新菜单
 * - 加载状态显示
 *
 * @example
 * ```vue
 * <template>
 *   <DynamicMenu />
 * </template>
 * ```
 */

import { computed, watch, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NMenu, NSpin } from 'naive-ui';
import { IconifyIcon } from '@vben/icons';
import { useMenuStore } from '#/store';
import type { MenuOption } from 'naive-ui';
import type { MenuApi } from '#/api/modules/menu';

const router = useRouter();
const route = useRoute();
const menuStore = useMenuStore();

/**
 * 菜单选项列表
 * 
 * 将 MenuStore 中的菜单树转换为 NMenu 组件所需的格式
 */
const menuOptions = computed(() => {
  console.log('DynamicMenu menuOptions computed:', {
    filteredMenuTree: menuStore.filteredMenuTree,
    selectedModuleCode: menuStore.selectedModuleCode,
  });
  return convertToMenuOptions(menuStore.filteredMenuTree);
});

/**
 * 当前激活的菜单项 key
 * 
 * 根据当前路由路径自动匹配对应的菜单项
 */
const activeKey = computed(() => {
  // 从当前路由找到对应的菜单 code
  const path = route.path;
  const findMenuCode = (nodes: MenuApi.MenuTreeNode[]): string | null => {
    for (const node of nodes) {
      if (node.path === path) {
        return node.code;
      }
      if (node.children && node.children.length > 0) {
        const found = findMenuCode(node.children);
        if (found) return found;
      }
    }
    return null;
  };
  return findMenuCode(menuStore.menuTree) || '';
});

/**
 * 将菜单树节点转换为 NMenu 选项格式
 * 
 * @param nodes 菜单树节点数组
 * @returns NMenu 组件所需的选项数组
 */
function convertToMenuOptions(nodes: MenuApi.MenuTreeNode[]): MenuOption[] {
  return nodes.map((node) => {
    const option: MenuOption = {
      key: node.code,
      label: node.name,
      icon: node.icon ? () => h(IconifyIcon, { icon: node.icon! }) : undefined,
    };

    if (node.children && node.children.length > 0) {
      option.children = convertToMenuOptions(node.children);
    }

    return option;
  });
}

/**
 * 处理菜单项选中事件
 * 
 * 根据选中的菜单项 key 查找对应的菜单节点，并跳转到对应路由
 * 
 * @param key 菜单项的 key（菜单编码）
 */
function handleMenuSelect(key: string) {
  const findNode = (nodes: MenuApi.MenuTreeNode[], code: string): MenuApi.MenuTreeNode | null => {
    for (const node of nodes) {
      if (node.code === code) return node;
      if (node.children) {
        const found = findNode(node.children, code);
        if (found) return found;
      }
    }
    return null;
  };

  const node = findNode(menuStore.menuTree, key);
  if (node && node.path) {
    router.push(node.path);
  }
}

// 监听模块切换，重新加载菜单
watch(
  () => menuStore.selectedModuleCode,
  () => {
    // 菜单会自动通过 computed 更新
  },
);
</script>

<template>
  <NSpin :show="menuStore.loading">
    <NMenu
      v-if="menuOptions.length > 0"
      :value="activeKey"
      :options="menuOptions"
      :collapsed="false"
      @update:value="handleMenuSelect"
    />
    <div v-else class="p-4 text-center text-gray-500">
      暂无菜单数据
    </div>
  </NSpin>
</template>
