<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui';

import type { ScheduledTaskApi } from '#/api/modules/scheduled-task';

import { computed, h, ref, resolveDirective, withDirectives } from 'vue';

import {
  NButton,
  NDataTable,
  NInput,
  NPagination,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
} from 'naive-ui';

defineOptions({ name: 'TaskTable' });

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

interface Props {
  data: ScheduledTaskApi.ScheduledTask[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  taskGroupOptions: { label: string; value: string }[];
}

interface Emits {
  (e: 'create'): void;
  (e: 'edit', row: ScheduledTaskApi.ScheduledTask): void;
  (e: 'delete', row: ScheduledTaskApi.ScheduledTask): void;
  (e: 'toggle', row: ScheduledTaskApi.ScheduledTask): void;
  (e: 'trigger', row: ScheduledTaskApi.ScheduledTask): void;
  (
    e: 'search',
    params: { enabled?: number; name?: string; taskGroup?: null | string },
  ): void;
  (e: 'update:page', page: number): void;
  (e: 'update:pageSize', pageSize: number): void;
}

const searchName = ref('');
const searchTaskGroup = ref<null | string>(null);
const searchEnabled = ref<number>(-1);
const accessDirective = resolveDirective('access');

function formatTime(dateStr: null | string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function handleSearch() {
  emit('search', {
    name: searchName.value || undefined,
    taskGroup: searchTaskGroup.value,
    enabled: searchEnabled.value === -1 ? undefined : searchEnabled.value,
  });
}

const columns = computed(
  (): DataTableColumns<ScheduledTaskApi.ScheduledTask> => [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_row, index) => index + 1,
    },
    { title: '任务名称', key: 'name', minWidth: 140 },
    { title: '任务组', key: 'taskGroup', width: 120 },
    {
      title: '触发类型',
      key: 'triggerType',
      width: 100,
      render: (row) =>
        h(
          NTag,
          {
            type: row.triggerType === 'CRON' ? 'info' : 'success',
            size: 'small',
          },
          { default: () => (row.triggerType === 'CRON' ? 'Cron' : '间隔') },
        ),
    },
    {
      title: '触发配置',
      key: 'triggerConfig',
      width: 160,
      render: (row) =>
        row.triggerType === 'CRON'
          ? (row.cronExpression ?? '')
          : `${row.intervalSeconds ?? 0}秒`,
    },
    {
      title: '状态',
      key: 'enabled',
      width: 80,
      render: (row) => {
        const node = h(NSwitch, {
          value: row.enabled === 1,
          onUpdateValue: () => emit('toggle', row),
        });
        return accessDirective
          ? withDirectives(node, [[accessDirective, 'scheduled-task:toggle']])
          : node;
      },
    },
    {
      title: '上次执行时间',
      key: 'lastExecuteTime',
      width: 170,
      render: (row) => formatTime(row.lastExecuteTime),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (row) => {
        const editBtn = h(
          NButton,
          {
            size: 'tiny',
            type: 'primary',
            onClick: () => emit('edit', row),
          },
          { default: () => '编辑' },
        );
        const triggerBtn = h(
          NButton,
          {
            size: 'tiny',
            type: 'warning',
            onClick: () => emit('trigger', row),
          },
          { default: () => '执行' },
        );
        const deleteBtn = h(
          NButton,
          {
            size: 'tiny',
            type: 'error',
            onClick: () => emit('delete', row),
          },
          { default: () => '删除' },
        );

        const buttons = accessDirective
          ? [
              withDirectives(editBtn, [
                [accessDirective, 'scheduled-task:update'],
              ]),
              withDirectives(triggerBtn, [
                [accessDirective, 'scheduled-task:trigger'],
              ]),
              withDirectives(deleteBtn, [
                [accessDirective, 'scheduled-task:delete'],
              ]),
            ]
          : [editBtn, triggerBtn, deleteBtn];

        return h(NSpace, { size: 8 }, { default: () => buttons });
      },
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
          v-model:value="searchName"
          clearable
          placeholder="任务名称"
          style="width: 180px"
        />
        <NSelect
          v-model:value="searchTaskGroup"
          clearable
          :options="props.taskGroupOptions"
          placeholder="任务组"
          style="width: 140px"
        />
        <NRadioGroup v-model:value="searchEnabled" size="small">
          <NRadioButton :value="-1">全部</NRadioButton>
          <NRadioButton :value="1">启用</NRadioButton>
          <NRadioButton :value="0">停用</NRadioButton>
        </NRadioGroup>
        <NButton type="primary" @click="handleSearch">查询</NButton>
      </NSpace>
      <NButton
        v-access="'scheduled-task:create'"
        type="primary"
        @click="emit('create')"
      >
        新增任务
      </NButton>
    </div>

    <!-- 表格 -->
    <NDataTable
      :columns="columns"
      :data="props.data"
      :loading="props.loading"
      :row-key="(row: ScheduledTaskApi.ScheduledTask) => row.id"
      :scroll-x="1100"
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
