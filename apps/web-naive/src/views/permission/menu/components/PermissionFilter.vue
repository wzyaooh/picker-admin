<script lang="ts" setup>
/**
 * 权限筛选组件
 *
 * 提供权限菜单的搜索和操作功能，包括：
 * - 模块切换（单选按钮组）
 * - 菜单名称搜索
 * - 新增菜单、批量删除按钮
 * - 展开/折叠、刷新按钮
 *
 * 组件采用响应式布局，支持移动端和桌面端显示。
 *
 * @example
 * ```vue
 * <PermissionFilter
 *   v-model:keyword="keyword"
 *   v-model:active-module-code="activeModuleCode"
 *   :modules="modules"
 *   :loading="loading"
 *   :checked-count="checkedRowKeys.length"
 *   @create="handleCreate"
 *   @batch-delete="handleBatchDelete"
 *   @expand-all="handleExpandAll"
 *   @collapse-all="handleCollapseAll"
 *   @refresh="handleRefresh"
 * />
 * ```
 */

import { NButton, NInput, NRadioButton, NRadioGroup } from 'naive-ui';
import { useDebounceFn } from '@vueuse/core';

/**
 * 模块类型
 */
type Module = {
  /** 模块ID */
  id: number;
  /** 模块名称 */
  name: string;
  /** 模块编码 */
  code: string;
  /** 模块图标 */
  icon?: string;
  /** 排序 */
  order: number;
};

/**
 * 组件 Props
 */
interface Props {
  /** 搜索关键词 */
  keyword?: string;
  /** 当前激活的模块编码 */
  activeModuleCode?: string;
  /** 模块列表 */
  modules?: Module[];
  /** 加载状态 */
  loading?: boolean;
  /** 选中的数量 */
  checkedCount?: number;
}

/**
 * 组件 Emits
 */
interface Emits {
  /** 关键词变化时触发 */
  (e: 'update:keyword', value: string): void;
  /** 激活模块变化时触发 */
  (e: 'update:activeModuleCode', value: string): void;
  /** 点击新增菜单按钮时触发 */
  (e: 'create'): void;
  /** 点击批量删除按钮时触发 */
  (e: 'batchDelete'): void;
  /** 点击展开按钮时触发 */
  (e: 'expandAll'): void;
  /** 点击折叠按钮时触发 */
  (e: 'collapseAll'): void;
  /** 点击刷新按钮时触发 */
  (e: 'refresh'): void;
  /** 点击清理缓存按钮时触发 */
  (e: 'clearCache'): void;
}

const props = withDefaults(defineProps<Props>(), {
  keyword: '',
  activeModuleCode: '',
  modules: () => [],
  loading: false,
  checkedCount: 0,
});

const emit = defineEmits<Emits>();

/**
 * 防抖处理关键词更新
 *
 * 使用 300ms 防抖延迟，避免用户输入时频繁触发搜索。
 * 这样可以减少不必要的计算和渲染，提升性能。
 */
const debouncedKeywordUpdate = useDebounceFn((value: string) => {
  emit('update:keyword', value);
}, 300);
</script>

<template>
  <div>
    <!-- 模块选择和搜索 -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="text-muted-foreground text-sm">模块:</div>
        <NRadioGroup
          :value="activeModuleCode"
          size="small"
          @update:value="emit('update:activeModuleCode', $event)"
        >
          <NRadioButton
            v-for="m in modules"
            :key="m.code"
            :value="m.code"
            :label="m.name"
          />
        </NRadioGroup>
      </div>

      <div class="flex items-center gap-2">
        <NInput
          :value="keyword"
          clearable
          placeholder="请输入菜单名称关键字"
          class="w-[320px]"
          @update:value="debouncedKeywordUpdate"
        />
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <NButton type="primary" @click="emit('create')">+ 新增菜单</NButton>
        <NButton
          tertiary
          type="error"
          :disabled="checkedCount === 0 || loading"
          @click="emit('batchDelete')"
        >
          批量删除
        </NButton>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <NButton tertiary :disabled="loading" @click="emit('expandAll')">
          展开
        </NButton>
        <NButton tertiary :disabled="loading" @click="emit('collapseAll')">
          折叠
        </NButton>
        <NButton tertiary :disabled="loading" @click="emit('refresh')">
          刷新
        </NButton>
        <NButton tertiary type="warning" :disabled="loading" @click="emit('clearCache')">
          清理缓存
        </NButton>
      </div>
    </div>
  </div>
</template>
