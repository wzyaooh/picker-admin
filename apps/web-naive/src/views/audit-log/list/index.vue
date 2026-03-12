<script lang="ts" setup>
import type { AuditApi } from '#/api/modules/audit';

import { onMounted, ref } from 'vue';

import { NCard } from 'naive-ui';

import { getAuditLogsApi } from '#/api/modules';

import AuditLogTable from './components/AuditLogTable.vue';
import AuditLogDrawer from './components/AuditLogDrawer.vue';

defineOptions({ name: 'AuditLogPage' });

// ==================== 状态管理 ====================
const loading = ref(false);
const dataSource = ref<AuditApi.AuditLog[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchParams = ref<{
  username?: string;
  action?: string;
  method?: string;
  path?: string;
  startDate?: string;
  endDate?: string;
  success?: number;
}>({});

// 详情抽屉
const drawerVisible = ref(false);
const selectedLog = ref<AuditApi.AuditLog | null>(null);

// ==================== 数据获取 ====================
async function fetchData() {
  loading.value = true;
  try {
    const params: AuditApi.QueryAuditParams = {
      page: page.value,
      pageSize: pageSize.value,
      ...searchParams.value,
    };

    const result = await getAuditLogsApi(params);
    dataSource.value = result.items;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

// ==================== 搜索 ====================
function handleSearch(params: typeof searchParams.value) {
  searchParams.value = params;
  page.value = 1;
  fetchData();
}

// ==================== 查看详情 ====================
function handleView(log: AuditApi.AuditLog) {
  selectedLog.value = log;
  drawerVisible.value = true;
}

// ==================== 导出 ====================
function handleExport() {
  // 导出功能待实现
}

// ==================== 分页 ====================
function handlePageChange(newPage: number) {
  page.value = newPage;
  fetchData();
}

function handlePageSizeChange(newSize: number) {
  pageSize.value = newSize;
  page.value = 1;
  fetchData();
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="p-4">
    <NCard title="操作日志" :bordered="false" size="small">
      <AuditLogTable
        :data="dataSource"
        :loading="loading"
        :page="page"
        :page-size="pageSize"
        :total="total"
        @search="handleSearch"
        @view="handleView"
        @export="handleExport"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </NCard>

    <!-- 详情抽屉 -->
    <AuditLogDrawer
      v-model:show="drawerVisible"
      :log="selectedLog"
    />
  </div>
</template>
