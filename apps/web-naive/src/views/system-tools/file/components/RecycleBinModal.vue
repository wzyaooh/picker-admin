<script lang="ts" setup>
import { ref, reactive, watch, h } from 'vue';
import { NModal, NButton, NSpace, NDataTable, NTag, NEmpty, NPagination } from 'naive-ui';
import { message, dialog } from '#/adapter/naive';
import type { DataTableColumns } from 'naive-ui';
import type { FileApi } from '#/api';
import {
  getRecycleBinListApi,
  restoreFileApi,
  restoreFolderApi,
  permanentlyDeleteFileApi,
  permanentlyDeleteFolderApi,
  emptyRecycleBinApi,
} from '#/api/modules/file';

interface Props {
  show: boolean;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'refresh'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 状态管理
const loading = ref(false);
const files = ref<FileApi.FileItem[]>([]);
const selectedRowKeys = ref<number[]>([]);

// 分页状态
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

// 表格列定义
const columns: DataTableColumns<FileApi.FileItem> = [
  {
    type: 'selection',
  },
  {
    title: '文件名',
    key: 'name',
    minWidth: 200,
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '类型',
    key: 'isFolder',
    width: 100,
    render: (row) => {
      if (row.isFolder) {
        return h(NTag, { type: 'info' }, { default: () => '文件夹' });
      }
      return h(NTag, {}, { default: () => row.extension || '文件' });
    },
  },
  {
    title: '大小',
    key: 'size',
    width: 120,
    render: (row) => formatFileSize(row.size),
  },
  {
    title: '删除时间',
    key: 'deletedAt',
    width: 180,
    render: (row) => row.deletedAt || '-',
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: (row) => {
      return h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, {
            size: 'small',
            type: 'primary',
            onClick: () => handleRestore(row),
          }, { default: () => '恢复' }),
          h(NButton, {
            size: 'small',
            type: 'error',
            onClick: () => handlePermanentDelete(row),
          }, { default: () => '永久删除' }),
        ],
      });
    },
  },
];

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '-';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// 获取回收站列表
async function fetchRecycleBin() {
  loading.value = true;
  try {
    const result = await getRecycleBinListApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    
    files.value = result.items || [];
    pagination.total = result.total || 0;
  } catch (_error) {
    message.error('获取回收站列表失败');
  } finally {
    loading.value = false;
  }
}

// Restore file
function handleRestore(file: FileApi.FileItem) {
  const itemType = file.isFolder ? '文件夹' : '文件';
  dialog.info({
    title: `恢复${itemType}`,
    content: `确定要恢复"${file.name}"吗？${itemType}将恢复到原位置。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        if (file.isFolder) {
          await restoreFolderApi(file.id);
        } else {
          await restoreFileApi(file.id);
        }
        message.success('恢复成功');
        await fetchRecycleBin();
        emit('refresh');
      } catch (_error) {
        // Error handled by interceptor
      }
    },
  });
}

// Permanently delete file
function handlePermanentDelete(file: FileApi.FileItem) {
  dialog.warning({
    title: '永久删除',
    content: `确定要永久删除"${file.name}"吗？此操作无法撤销！${file.isFolder ? '文件夹内的所有内容也将被永久删除。' : ''}`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        if (file.isFolder) {
          await permanentlyDeleteFolderApi(file.id);
        } else {
          await permanentlyDeleteFileApi(file.id);
        }
        message.success('删除成功');
        await fetchRecycleBin();
        emit('refresh');
      } catch (_error) {
        // Error handled by interceptor
      }
    },
  });
}

// Batch restore
function handleBatchRestore() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请选择要恢复的项目');
    return;
  }

  const selectedItems = files.value.filter(f => selectedRowKeys.value.includes(f.id));
  const fileNames = selectedItems
    .map(f => f.name)
    .slice(0, 3)
    .join('、');
  
  const displayText = selectedRowKeys.value.length > 3 
    ? `${fileNames} 等 ${selectedRowKeys.value.length} 个项目`
    : fileNames;

  dialog.info({
    title: '批量恢复',
    content: `确定要恢复"${displayText}"吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        for (const item of selectedItems) {
          if (item.isFolder) {
            await restoreFolderApi(item.id);
          } else {
            await restoreFileApi(item.id);
          }
        }
        message.success('恢复成功');
        selectedRowKeys.value = [];
        await fetchRecycleBin();
        emit('refresh');
      } catch (_error) {
        // Error handled by interceptor
      }
    },
  });
}

// Batch permanently delete
function handleBatchPermanentDelete() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请选择要删除的项目');
    return;
  }

  const selectedItems = files.value.filter(f => selectedRowKeys.value.includes(f.id));
  const fileNames = selectedItems
    .map(f => f.name)
    .slice(0, 3)
    .join('、');
  
  const displayText = selectedRowKeys.value.length > 3 
    ? `${fileNames} 等 ${selectedRowKeys.value.length} 个项目`
    : fileNames;

  const hasFolders = selectedItems.some(item => item.isFolder);
  const warningText = hasFolders 
    ? '此操作无法撤销！文件夹内的所有内容也将被永久删除。' 
    : '此操作无法撤销！';

  dialog.warning({
    title: '批量永久删除',
    content: `确定要永久删除"${displayText}"吗？${warningText}`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        for (const item of selectedItems) {
          if (item.isFolder) {
            await permanentlyDeleteFolderApi(item.id);
          } else {
            await permanentlyDeleteFileApi(item.id);
          }
        }
        message.success('删除成功');
        selectedRowKeys.value = [];
        await fetchRecycleBin();
        emit('refresh');
      } catch (_error) {
        // Error handled by interceptor
      }
    },
  });
}

// Empty recycle bin
function handleEmptyRecycleBin() {
  if (files.value.length === 0) {
    message.warning('回收站已经是空的');
    return;
  }

  const hasFolders = files.value.some(item => item.isFolder);
  const warningText = hasFolders 
    ? '所有文件和文件夹将被永久删除，文件夹内的所有内容也将被删除，此操作无法撤销！' 
    : '所有文件将被永久删除，此操作无法撤销！';

  dialog.error({
    title: '清空回收站',
    content: `确定要清空回收站吗？${warningText}`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await emptyRecycleBinApi();
        message.success('清空成功');
        selectedRowKeys.value = [];
        await fetchRecycleBin();
        emit('refresh');
      } catch (_error) {
        // Error handled by interceptor
      }
    },
  });
}

// Handle pagination change
function handlePageChange(page: number) {
  pagination.page = page;
  fetchRecycleBin();
}

// Handle selection change
function handleCheck(rowKeys: Array<string | number>) {
  selectedRowKeys.value = rowKeys as number[];
}

// Watch modal visibility
watch(() => props.show, (newVal) => {
  if (newVal) {
    pagination.page = 1;
    selectedRowKeys.value = [];
    fetchRecycleBin();
  }
});
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    title="回收站"
    :style="{ width: '1200px' }"
    @update:show="emit('update:show', $event)"
  >
    <template #header-extra>
      <NSpace>
        <NButton
          v-if="selectedRowKeys.length > 0"
          size="small"
          type="primary"
          @click="handleBatchRestore"
        >
          批量恢复 ({{ selectedRowKeys.length }})
        </NButton>
        <NButton
          v-if="selectedRowKeys.length > 0"
          size="small"
          type="error"
          @click="handleBatchPermanentDelete"
        >
          批量删除 ({{ selectedRowKeys.length }})
        </NButton>
        <NButton
          size="small"
          type="error"
          :disabled="files.length === 0"
          @click="handleEmptyRecycleBin"
        >
          清空回收站
        </NButton>
      </NSpace>
    </template>

    <!-- Notice -->
    <div class="mb-4 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-400">
      <i class="lucide:info mr-2" />
      回收站中的文件和文件夹将在 30 天后自动永久删除
    </div>

    <!-- Data Table -->
    <NDataTable
      :columns="columns"
      :data="files"
      :loading="loading"
      :row-key="(row: FileApi.FileItem) => row.id"
      :checked-row-keys="selectedRowKeys"
      :max-height="400"
      @update:checked-row-keys="handleCheck"
    >
      <template #empty>
        <NEmpty description="回收站为空" />
      </template>
    </NDataTable>

    <!-- Pagination -->
    <div v-if="pagination.total > 0" class="mt-4 flex justify-end">
      <NPagination
        v-model:page="pagination.page"
        :page-count="Math.ceil(pagination.total / pagination.pageSize)"
        :page-size="pagination.pageSize"
        show-size-picker
        :page-sizes="[10, 20, 30, 50]"
        @update:page="handlePageChange"
        @update:page-size="(size) => { pagination.pageSize = size; fetchRecycleBin(); }"
      />
    </div>
  </NModal>
</template>
