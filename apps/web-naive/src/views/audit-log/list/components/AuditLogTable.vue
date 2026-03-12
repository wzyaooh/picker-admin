<script lang="ts" setup>
import type { AuditApi } from '#/api/modules/audit';
import type { DataTableColumns } from 'naive-ui';

import { computed, h, ref } from 'vue';
import { NButton, NDataTable, NDatePicker, NInput, NPagination, NSelect, NSpace, NTag } from 'naive-ui';

import { message } from '#/adapter/naive';

interface Props {
  data: AuditApi.AuditLog[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
}

interface Emits {
  (e: 'search', params: any): void;
  (e: 'view', log: AuditApi.AuditLog): void;
  (e: 'export'): void;
  (e: 'update:page', page: number): void;
  (e: 'update:page-size', pageSize: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

// ==================== 搜索表单 ====================
const searchForm = ref({
  username: '',
  action: '',
  method: null as null | string,
  path: '',
  dateRange: null as null | [number, number],
  success: null as null | number,
});

const methodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
];

const successOptions = [
  { label: '全部', value: null as any },
  { label: '成功', value: 1 },
  { label: '失败', value: 0 },
];

function handleSearch() {
  const params: any = {};
  
  if (searchForm.value.username) {
    params.username = searchForm.value.username;
  }
  if (searchForm.value.action) {
    params.action = searchForm.value.action;
  }
  if (searchForm.value.method) {
    params.method = searchForm.value.method;
  }
  if (searchForm.value.path) {
    params.path = searchForm.value.path;
  }
  if (searchForm.value.success !== null) {
    params.success = searchForm.value.success;
  }
  if (searchForm.value.dateRange) {
    params.startDate = new Date(searchForm.value.dateRange[0]).toISOString().split('T')[0];
    params.endDate = new Date(searchForm.value.dateRange[1]).toISOString().split('T')[0];
  }
  
  emit('search', params);
}

function handleReset() {
  searchForm.value = {
    username: '',
    action: '',
    method: null,
    path: '',
    dateRange: null,
    success: null,
  };
  emit('search', {});
}

// ==================== 表格列定义 ====================
const columns = computed((): DataTableColumns<AuditApi.AuditLog> => [
  { title: 'ID', key: 'id', width: 80 },
  { 
    title: '操作时间', 
    key: 'time', 
    width: 180,
    render: (row) => new Date(row.time).toLocaleString('zh-CN'),
  },
  { 
    title: '用户', 
    key: 'username', 
    width: 120,
    render: (row) => row.username || '-',
  },
  { 
    title: '操作', 
    key: 'action', 
    minWidth: 150,
    render: (row) => row.action || row.description || '-',
  },
  { 
    title: '请求方法', 
    key: 'method', 
    width: 100,
    render: (row) => {
      const colorMap: Record<string, 'info' | 'success' | 'warning' | 'error' | 'default'> = {
        GET: 'info',
        POST: 'success',
        PATCH: 'warning',
        PUT: 'warning',
        DELETE: 'error',
      };
      return h(NTag, { type: colorMap[row.method] || 'default', size: 'small' }, 
        { default: () => row.method });
    },
  },
  { 
    title: '请求路径', 
    key: 'path', 
    minWidth: 200,
    ellipsis: { tooltip: true },
  },
  { 
    title: 'IP地址', 
    key: 'ip', 
    width: 140,
    render: (row) => row.ip || '-',
  },
  { 
    title: '耗时', 
    key: 'durationMs', 
    width: 100,
    render: (row) => `${row.durationMs}ms`,
  },
  { 
    title: '状态', 
    key: 'success', 
    width: 80,
    render: (row) => 
      h(NTag, { 
        type: row.success ? 'success' : 'error',
        size: 'small',
      }, { default: () => row.success ? '成功' : '失败' }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, {
            size: 'tiny',
            type: 'primary',
            onClick: () => emit('view', row),
          }, { default: () => '查看' }),
        ],
      }),
  },
]);

// ==================== 导出功能 ====================
function handleExport() {
  message.info('导出功能开发中...');
  emit('export');
}
</script>

<template>
  <div>
    <!-- 搜索栏 -->
    <div class="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      <NInput
        v-model:value="searchForm.username"
        placeholder="用户名"
        clearable
      />
      <NInput
        v-model:value="searchForm.action"
        placeholder="操作描述"
        clearable
      />
      <NSelect
        v-model:value="searchForm.method"
        :options="methodOptions"
        placeholder="请求方法"
        clearable
      />
      <NInput
        v-model:value="searchForm.path"
        placeholder="请求路径"
        clearable
      />
      <NDatePicker
        v-model:value="searchForm.dateRange"
        type="daterange"
        placeholder="选择日期范围"
        clearable
        class="w-full"
      />
      <NSelect
        v-model:value="searchForm.success"
        :options="successOptions"
        placeholder="执行状态"
        clearable
      />
      <NSpace>
        <NButton type="primary" @click="handleSearch">
          查询
        </NButton>
        <NButton @click="handleReset">
          重置
        </NButton>
      </NSpace>
      <NSpace justify="end">
        <NButton
          v-access="'audit-log:export'"
          type="info"
          @click="handleExport"
        >
          导出
        </NButton>
      </NSpace>
    </div>

    <!-- 表格 -->
    <NDataTable
      :columns="columns"
      :data="data"
      :loading="loading"
      :row-key="(row: AuditApi.AuditLog) => row.id"
      :scroll-x="1300"
      striped
    />

    <!-- 分页 -->
    <div class="mt-4 flex justify-end">
      <NPagination
        :page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :item-count="total"
        show-size-picker
        @update:page="emit('update:page', $event)"
        @update:page-size="emit('update:page-size', $event)"
      />
    </div>
  </div>
</template>
