<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui';

import type { ScheduledTaskApi } from '#/api/modules/scheduled-task';

import { computed, h, ref } from 'vue';

import {
  NButton,
  NDataTable,
  NDatePicker,
  NInput,
  NPagination,
  NSelect,
  NSpace,
  NTag,
} from 'naive-ui';

defineOptions({ name: 'LogTable' });

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

interface Props {
  data: ScheduledTaskApi.TaskLog[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
}

interface Emits {
  (
    e: 'search',
    params: {
      startTimeFrom?: string;
      startTimeTo?: string;
      status?: null | string;
      taskName?: string;
    },
  ): void;
  (e: 'clearAll'): void;
  (e: 'update:page', page: number): void;
  (e: 'update:pageSize', pageSize: number): void;
}

const searchTaskName = ref('');
const searchStatus = ref<null | string>(null);
const dateRange = ref<[number, number] | null>(null);

const statusOptions = [
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAIL' },
  { label: '超时', value: 'TIMEOUT' },
];

function formatTime(dateStr: null | string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function handleSearch() {
  const params: {
    startTimeFrom?: string;
    startTimeTo?: string;
    status?: null | string;
    taskName?: string;
  } = {};
  if (searchTaskName.value) params.taskName = searchTaskName.value;
  if (searchStatus.value) params.status = searchStatus.value;
  if (dateRange.value) {
    params.startTimeFrom = new Date(dateRange.value[0]).toISOString();
    params.startTimeTo = new Date(dateRange.value[1]).toISOString();
  }
  emit('search', params);
}

const columns = computed(
  (): DataTableColumns<ScheduledTaskApi.TaskLog> => [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_row, index) => index + 1,
    },
    { title: '任务名称', key: 'taskName', minWidth: 140 },
    {
      title: '触发方式',
      key: 'triggeredBy',
      width: 90,
      render: (row) => (row.triggeredBy === 'SCHEDULE' ? '调度' : '手动'),
    },
    {
      title: '开始时间',
      key: 'startTime',
      width: 170,
      render: (row) => formatTime(row.startTime),
    },
    {
      title: '结束时间',
      key: 'endTime',
      width: 170,
      render: (row) => formatTime(row.endTime),
    },
    {
      title: '耗时',
      key: 'durationMs',
      width: 100,
      render: (row) => formatDuration(row.durationMs),
    },
    {
      title: '执行状态',
      key: 'status',
      width: 90,
      render: (row) => {
        const map: Record<
          string,
          { label: string; type: 'error' | 'success' | 'warning' }
        > = {
          FAIL: { label: '失败', type: 'error' },
          SUCCESS: { label: '成功', type: 'success' },
          TIMEOUT: { label: '超时', type: 'warning' },
        };
        const info = map[row.status] || {
          label: row.status,
          type: 'default' as any,
        };
        return h(
          NTag,
          { type: info.type, size: 'small' },
          { default: () => info.label },
        );
      },
    },
    {
      title: '错误信息',
      key: 'errorMessage',
      minWidth: 200,
      ellipsis: { tooltip: true },
    },
  ],
);
</script>

<template>
  <div>
    <!-- 搜索栏 -->
    <div class="mb-3 flex items-center justify-between">
      <NSpace>
        <NInput
          v-model:value="searchTaskName"
          clearable
          placeholder="任务名称"
          style="width: 180px"
        />
        <NSelect
          v-model:value="searchStatus"
          clearable
          :options="statusOptions"
          placeholder="执行状态"
          style="width: 120px"
        />
        <NDatePicker v-model:value="dateRange" clearable type="daterange" />
        <NButton type="primary" @click="handleSearch">查询</NButton>
      </NSpace>
      <NButton
        v-access="'scheduled-task-log:clear'"
        type="error"
        @click="emit('clearAll')"
      >
        清空日志
      </NButton>
    </div>

    <!-- 表格 -->
    <NDataTable
      :columns="columns"
      :data="props.data"
      :loading="props.loading"
      :row-key="(row: ScheduledTaskApi.TaskLog) => row.id"
      :scroll-x="1200"
      striped
    />

    <!-- 分页 -->
    <div class="mt-3 flex justify-end">
      <NPagination
        :item-count="props.total"
        :page="props.page"
        :page-size="props.pageSize"
        :page-sizes="[10, 20, 50]"
        show-size-picker
        @update:page="emit('update:page', $event)"
        @update:page-size="emit('update:pageSize', $event)"
      />
    </div>
  </div>
</template>
