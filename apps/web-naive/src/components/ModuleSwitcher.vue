<script setup lang="ts">
/**
 * 模块切换器组件
 *
 * 提供模块选择下拉框，用于切换不同的业务模块。
 * 切换模块后，会自动更新菜单树，只显示当前模块下的菜单。
 *
 * 功能特性：
 * - 显示所有可用模块列表
 * - 支持模块图标显示
 * - 双向绑定选中的模块
 * - 切换模块时自动更新菜单
 *
 * @example
 * ```vue
 * <template>
 *   <ModuleSwitcher />
 * </template>
 * ```
 */

import { computed, h } from 'vue';
import { NSelect } from 'naive-ui';
import { IconifyIcon } from '@vben/icons';
import { useMenuStore } from '#/store';

const menuStore = useMenuStore();

/**
 * 模块选项列表
 * 
 * 将 MenuStore 中的模块列表转换为 NSelect 组件所需的格式
 */
const options = computed(() => {
  return menuStore.modules.map((module) => ({
    label: module.name,
    value: module.code,
    icon: module.icon,
  }));
});

/**
 * 当前选中的模块编码
 * 
 * 双向绑定，修改时会调用 MenuStore 的 switchModule 方法
 */
const selectedValue = computed({
  get: () => menuStore.selectedModuleCode,
  set: (value: string) => menuStore.switchModule(value),
});

/**
 * 自定义渲染选项标签
 * 
 * 在选项中显示图标和文本
 * 
 * @param option 选项数据
 * @returns 渲染的 VNode
 */
function renderLabel(option: any) {
  return h('div', { class: 'flex items-center gap-2' }, [
    option.icon && h(IconifyIcon, { icon: option.icon, size: 16 }),
    h('span', option.label),
  ]);
}
</script>

<template>
  <NSelect
    v-model:value="selectedValue"
    :options="options"
    :render-label="renderLabel"
    class="w-48"
    placeholder="选择模块"
  />
</template>
