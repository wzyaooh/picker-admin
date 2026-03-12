<script lang="ts" setup>
/**
 * 用户筛选组件
 *
 * 提供用户列表的搜索和操作功能，包括：
 * - 用户名搜索（带防抖优化）
 * - 查询、重置、刷新按钮
 * - 批量删除、新增用户按钮
 *
 * 组件采用响应式布局，支持移动端和桌面端显示。
 * 搜索输入使用 300ms 防抖，减少不必要的 API 调用。
 *
 * @example
 * ```vue
 * <UserFilter
 *   v-model:keyword="keyword"
 *   :loading="loading"
 *   :checked-count="checkedRowKeys.length"
 *   @search="handleSearch"
 *   @reset="handleReset"
 *   @refresh="handleRefresh"
 *   @create="handleCreate"
 *   @batch-delete="handleBatchDelete"
 * />
 * ```
 */

import { NButton, NInput, NSpace } from 'naive-ui';
import { useDebounceFn } from '@vueuse/core';

/**
 * 组件 Props
 */
interface Props {
  /** 搜索关键词 */
  keyword?: string;
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
  /** 点击查询按钮时触发 */
  (e: 'search'): void;
  /** 点击重置按钮时触发 */
  (e: 'reset'): void;
  /** 点击刷新按钮时触发 */
  (e: 'refresh'): void;
  /** 点击新增用户按钮时触发 */
  (e: 'create'): void;
  /** 点击批量删除按钮时触发 */
  (e: 'batchDelete'): void;
}

const props = withDefaults(defineProps<Props>(), {
  keyword: '',
  loading: false,
  checkedCount: 0,
});

const emit = defineEmits<Emits>();

/**
 * 处理关键词变化（带防抖）
 *
 * 使用 300ms 防抖，避免用户输入时频繁触发搜索。
 * 当用户停止输入 300ms 后，自动触发搜索。
 *
 * @param value 新的关键词值
 */
const handleKeywordChange = useDebounceFn((value: string) => {
  emit('update:keyword', value);
  // 自动触发搜索
  emit('search');
}, 300);

/**
 * 处理回车键搜索
 *
 * 当用户在搜索框中按下回车键时，立即触发搜索操作（不等待防抖）。
 */
function handleEnterSearch() {
  emit('search');
}
</script>

<template>
  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
    <!-- 左侧：搜索和操作按钮 -->
    <NSpace :wrap="true" :size="12" align="center">
      <NInput
        :value="keyword"
        clearable
        placeholder="搜索用户名"
        class="w-[260px]"
        @update:value="handleKeywordChange"
        @keyup.enter="handleEnterSearch"
      />
      <NButton type="primary" :loading="loading" @click="emit('search')">
        查询
      </NButton>
      <NButton :disabled="loading" @click="emit('reset')">
        重置
      </NButton>
      <NButton tertiary :disabled="loading" @click="emit('refresh')">
        刷新
      </NButton>
    </NSpace>

    <!-- 右侧：批量操作和新增按钮 -->
    <NSpace :wrap="true" :size="12" align="center">
      <NButton
        :disabled="checkedCount === 0 || loading"
        tertiary
        type="error"
        @click="emit('batchDelete')"
      >
        删除选中 {{ checkedCount > 0 ? `(${checkedCount})` : '' }}
      </NButton>
      <NButton type="primary" :disabled="loading" @click="emit('create')">
        新增用户
      </NButton>
    </NSpace>
  </div>
</template>
