<script lang="ts" setup>
import type { ScheduledTaskApi } from '#/api/modules/scheduled-task';

import { onMounted, ref } from 'vue';

import { NCard } from 'naive-ui';

import { dialog, message } from '#/adapter/naive';
import { clearAllLogsApi, getTaskLogsApi } from '#/api/modules';

import LogTable from './components/LogTable.vue';

defineOptions({ name: 'ScheduledTaskLogPage' });

// ==================== 状态管理 ====================
const loading = ref(false);
const dataSource = ref<ScheduledTaskApi.TaskLog[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchParams = ref<{
  startTimeFrom?: string;
  startTimeTo?: string;
  status?: null | string;
  taskName?: string;
}>({});

// ==================== 数据获取 ====================
async function fetchData() {
  loading.value = true;
  try {
    const params: ScheduledTaskApi.QueryLogParams = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (searchParams.value.taskName) {
      params.taskName = searchParams.value.taskName;
    }
    if (searchParams.value.status) {
      params.status = searchParams.value.status;
    }
    if (searchParams.value.startTimeFrom) {
      params.startTimeFrom = searchParams.value.startTimeFrom;
    }
    if (searchParams.value.startTimeTo) {
      params.startTimeTo = searchParams.value.startTimeTo;
    }

    const result = await getTaskLogsApi(params);
    dataSource.value = result.pageData;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

// ==================== 搜索 ====================
function handleSearch(params: {
  startTimeFrom?: string;
  startTimeTo?: string;
  status?: null | string;
  taskName?: string;
}) {
  searchParams.value = params;
  page.value = 1;
  fetchData();
}

// ==================== 清空日志 ====================
function handleClearAll() {
  dialog.warning({
    title: '确认清空',
    content: '确定要清空所有执行日志吗？此操作不可恢复。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await clearAllLogsApi();
        message.success('日志已清空');
        await fetchData();
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
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
    <NCard title="任务日志" :bordered="false" size="small">
      <LogTable
        :data="dataSource"
        :loading="loading"
        :page="page"
        :page-size="pageSize"
        :total="total"
        @search="handleSearch"
        @clear-all="handleClearAll"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </NCard>
  </div>
</template>
