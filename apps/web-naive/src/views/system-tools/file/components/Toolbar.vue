<script lang="ts" setup>
import { ref } from 'vue';
import { NButton, NSpace, NInput, NDropdown, NSelect } from 'naive-ui';
import { IconifyIcon } from '@vben/icons';
import { useDebounceFn } from '@vueuse/core';
import type { FileApi } from '#/api';

interface Props {
  selectedCount: number;
  sortBy?: FileApi.SortBy;
  sortOrder?: FileApi.SortOrder;
}

interface Emits {
  (e: 'upload'): void;
  (e: 'create-folder'): void;
  (e: 'search', keyword: string): void;
  (e: 'batch-delete'): void;
  (e: 'batch-move'): void;
  (e: 'batch-download'): void;
  (e: 'sort-change', sortBy: FileApi.SortBy, sortOrder: FileApi.SortOrder): void;
}

const props = withDefaults(defineProps<Props>(), {
  sortBy: 'name',
  sortOrder: 'asc',
});

const emit = defineEmits<Emits>();

const searchKeyword = ref('');
const currentSortBy = ref<FileApi.SortBy>(props.sortBy);
const currentSortOrder = ref<FileApi.SortOrder>(props.sortOrder);

// 批量操作菜单
const batchOptions = [
  {
    label: '批量删除',
    key: 'delete',
  },
  {
    label: '批量移动',
    key: 'move',
  },
  {
    label: '批量下载',
    key: 'download',
  },
];

// 排序选项
const sortOptions = [
  { label: '名称', value: 'name' },
  { label: '大小', value: 'size' },
  { label: '日期', value: 'date' },
  { label: '类型', value: 'type' },
];

// 排序顺序选项
const sortOrderOptions = [
  { label: '升序', value: 'asc' },
  { label: '降序', value: 'desc' },
];

// 处理批量操作
function handleBatchAction(key: string) {
  switch (key) {
    case 'delete':
      emit('batch-delete');
      break;
    case 'move':
      emit('batch-move');
      break;
    case 'download':
      emit('batch-download');
      break;
  }
}

// 处理排序变化
function handleSortChange() {
  emit('sort-change', currentSortBy.value, currentSortOrder.value);
}

// 防抖搜索
const debouncedSearch = useDebounceFn((keyword: string) => {
  emit('search', keyword);
}, 300);

// 处理搜索
function handleSearch() {
  debouncedSearch(searchKeyword.value);
}
</script>

<template>
  <div class="mb-4 flex items-center justify-between gap-4">
    <!-- 左侧操作按钮 -->
    <NSpace>
      <NButton type="primary" @click="emit('upload')">
        <template #icon>
          <IconifyIcon icon="lucide:upload" />
        </template>
        上传文件
      </NButton>

      <NButton @click="emit('create-folder')">
        <template #icon>
          <IconifyIcon icon="lucide:folder-plus" />
        </template>
        新建文件夹
      </NButton>

      <NDropdown
        v-if="selectedCount > 0"
        :options="batchOptions"
        @select="handleBatchAction"
      >
        <NButton>
          <template #icon>
            <IconifyIcon icon="lucide:more-horizontal" />
          </template>
          批量操作 ({{ selectedCount }})
        </NButton>
      </NDropdown>
    </NSpace>

    <!-- 右侧搜索和排序 -->
    <NSpace>
      <!-- 排序选择器 -->
      <NSpace :size="8">
        <NSelect
          v-model:value="currentSortBy"
          :options="sortOptions"
          style="width: 100px"
          @update:value="handleSortChange"
        />
        <NSelect
          v-model:value="currentSortOrder"
          :options="sortOrderOptions"
          style="width: 80px"
          @update:value="handleSortChange"
        />
      </NSpace>

      <!-- 搜索框 -->
      <div class="w-64">
        <NInput
          v-model:value="searchKeyword"
          placeholder="搜索文件"
          clearable
          @input="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <IconifyIcon icon="lucide:search" />
          </template>
        </NInput>
      </div>
    </NSpace>
  </div>
</template>
