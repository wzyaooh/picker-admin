<script lang="ts" setup>
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NDataTable, NDatePicker, NInput, NPagination, NSelect, NSpace, NTag } from 'naive-ui';
import { getAuditLogsApi, type AuditApi } from '#/api';

interface Emits {
  (e: 'view-detail', log: AuditApi.AuditLog): void;
}

const emit = defineEmits<Emits>();

// 状态管理
const loading = ref(false);
const dataSource = ref<AuditApi.AuditLog[]>([]);
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

// 搜索条件
const searchForm = reactive({
  userId: undefined as number | undefined,
  username: '',
  method: undefined as string | undefined,
  path: '',
  action: '',
  success: undefined as number | undefined,
  startTime: null as number | null,
  endTime: null as number | null,
});

// 方法选项
const methodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
];

// 状态选项
const successOptions = [
  { label: '成功', value: 1 },
  { label: '失败', value: 0 },
];

// 表格列定义
const columns = computed((): DataTableColumns<AuditApi.AuditLog> => [
  { title: 'ID', key: 'id', width: 80 },
  {
    title: '用户',
    key: 'username',
    width: 120,
    render: (row) => row.username || '-',
  },
  {
    title: '操作',
    key: 'description',
    minWidth: 160,
    render: (row) => row.description || row.action || '-',
  },
  {
    title: '方法',
    key: 'method',
    width: 80,
    render: (row) =>
      h(
        NTag,
        {
          type: row.method === 'GET' ? 'info' : row.method === 'POST' ? 'success' : row.method === 'DELETE' ? 'error' : 'warning',
          size: 'small',
        },
        { default: () => row.method },
      ),
  },
  {
    title: '路径',
    key: 'path',
    minWidth: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: '状态',
    key: 'success',
    width: 80,
    render: (row) =>
      h(
        NTag,
        {
          type: row.success === 1 ? 'success' : 'error',
          size: 'small',
        },
        { default: () => (row.success === 1 ? '成功' : '失败') },
      ),
  },
  {
    title: 'IP',
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
    title: '时间',
    key: 'time',
    width: 180,
    render: (row) => new Date(row.time).toLocaleString('zh-CN'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (row) =>
      h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          onClick: () => emit('view-detail', row),
        },
        { default: () => '详情' },
      ),
  },
]);

// 获取数据
async function fetchData() {
  loading.value = true;
  try {
    const result = await getAuditLogsApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      userId: searchForm.userId,
      username: searchForm.username || undefined,
      method: searchForm.method,
      path: searchForm.path || undefined,
      action: searchForm.action || undefined,
      success: searchForm.success,
      startDate: searchForm.startTime ? new Date(searchForm.startTime).toISOString().split('T')[0] : undefined,
      endDate: searchForm.endTime ? new Date(searchForm.endTime).toISOString().split('T')[0] : undefined,
    });
    dataSource.value = result.items;
    pagination.total = result.total;
  } finally {
    loading.value = false;
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1;
  fetchData();
}

// 重置
function handleReset() {
  searchForm.userId = undefined;
  searchForm.username = '';
  searchForm.method = undefined;
  searchForm.path = '';
  searchForm.action = '';
  searchForm.success = undefined;
  searchForm.startTime = null;
  searchForm.endTime = null;
  pagination.page = 1;
  fetchData();
}

// 分页变化
function handlePageChange(page: number) {
  pagination.page = page;
  fetchData();
}

// 初始化
fetchData();

// 暴露方法
defineExpose({ fetchData });
</script>

<template>
  <div>
    <!-- 搜索栏 -->
    <div class="mb-4 space-y-3">
      <NSpace>
        <NInput
          v-model:value="searchForm.username"
          placeholder="用户名"
          clearable
          style="width: 160px"
        />
        <NSelect
          v-model:value="searchForm.method"
          placeholder="请求方法"
          clearable
          :options="methodOptions"
          style="width: 120px"
        />
        <NInput
          v-model:value="searchForm.path"
          placeholder="请求路径"
          clearable
          style="width: 200px"
        />
        <NInput
          v-model:value="searchForm.action"
          placeholder="操作描述"
          clearable
          style="width: 160px"
        />
        <NSelect
          v-model:value="searchForm.success"
          placeholder="状态"
          clearable
          :options="successOptions"
          style="width: 100px"
        />
      </NSpace>
      
      <NSpace>
        <NDatePicker
          v-model:value="searchForm.startTime"
          type="datetime"
          placeholder="开始时间"
          clearable
          style="width: 200px"
        />
        <NDatePicker
          v-model:value="searchForm.endTime"
          type="datetime"
          placeholder="结束时间"
          clearable
          style="width: 200px"
        />
        <NButton type="primary" @click="handleSearch">查询</NButton>
        <NButton @click="handleReset">重置</NButton>
      </NSpace>
    </div>

    <!-- 表格 -->
    <NDataTable
      :columns="columns"
      :data="dataSource"
      :loading="loading"
      :row-key="(row: AuditApi.AuditLog) => row.id"
      :scroll-x="1400"
      striped
    />

    <!-- 分页 -->
    <div class="mt-4 flex justify-end">
      <NPagination
        v-model:page="pagination.page"
        :page-size="pagination.pageSize"
        :item-count="pagination.total"
        show-size-picker
        :page-sizes="[10, 20, 50, 100]"
        @update:page="handlePageChange"
        @update:page-size="
          (pageSize: number) => {
            pagination.pageSize = pageSize;
            pagination.page = 1;
            fetchData();
          }
        "
      />
    </div>
  </div>
</template>
