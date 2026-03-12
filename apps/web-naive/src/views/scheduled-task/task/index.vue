<script lang="ts" setup>
import type { ScheduledTaskApi } from '#/api/modules/scheduled-task';

import { onMounted, ref } from 'vue';

import { NCard } from 'naive-ui';

import { dialog, message } from '#/adapter/naive';
import {
  getScheduledTaskListApi,
  createScheduledTaskApi,
  updateScheduledTaskApi,
  deleteScheduledTaskApi,
  enableTaskApi,
  disableTaskApi,
  getHandlersApi,
  triggerTaskApi,
} from '#/api/modules';

import TaskModal from './components/TaskModal.vue';
import TaskTable from './components/TaskTable.vue';

defineOptions({ name: 'ScheduledTaskPage' });

// ==================== 状态管理 ====================
const loading = ref(false);
const dataSource = ref<ScheduledTaskApi.ScheduledTask[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchParams = ref<{
  enabled?: number;
  name?: string;
  taskGroup?: null | string;
}>({});

const showModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const editingTask = ref<ScheduledTaskApi.ScheduledTask | undefined>(undefined);
const handlers = ref<string[]>([]);
const taskGroupOptions = ref<{ label: string; value: string }[]>([]);

// ==================== 数据获取 ====================
async function fetchData() {
  loading.value = true;
  try {
    const params: ScheduledTaskApi.QueryParams = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (searchParams.value.name) {
      params.name = searchParams.value.name;
    }
    if (searchParams.value.taskGroup) {
      params.taskGroup = searchParams.value.taskGroup;
    }
    if (searchParams.value.enabled !== undefined) {
      params.enabled = searchParams.value.enabled;
    }

    const result = await getScheduledTaskListApi(params);
    dataSource.value = result.pageData;
    total.value = result.total;
    updateTaskGroupOptions();
  } finally {
    loading.value = false;
  }
}

async function fetchHandlers() {
  try {
    handlers.value = await getHandlersApi();
  } catch {
    // 错误已被拦截器处理
  }
}

function updateTaskGroupOptions() {
  const groups = new Set(
    dataSource.value.map((t) => t.taskGroup).filter(Boolean),
  );
  taskGroupOptions.value = [...groups].map((g) => ({ label: g, value: g }));
}

// ==================== 搜索 ====================
function handleSearch(params: {
  enabled?: number;
  name?: string;
  taskGroup?: null | string;
}) {
  searchParams.value = params;
  page.value = 1;
  fetchData();
}

// ==================== 新增/编辑 ====================
function handleCreate() {
  modalMode.value = 'create';
  editingTask.value = undefined;
  showModal.value = true;
}

function handleEdit(row: ScheduledTaskApi.ScheduledTask) {
  modalMode.value = 'edit';
  editingTask.value = row;
  showModal.value = true;
}

async function handleSubmit(data: ScheduledTaskApi.CreateParams) {
  try {
    if (modalMode.value === 'edit' && editingTask.value) {
      await updateScheduledTaskApi(editingTask.value.id, data);
      message.success('更新成功');
    } else {
      await createScheduledTaskApi(data);
      message.success('创建成功');
    }
    showModal.value = false;
    await fetchData();
  } catch {
    // 错误已被拦截器处理
  }
}

// ==================== 删除 ====================
function handleDelete(row: ScheduledTaskApi.ScheduledTask) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除任务「${row.name}」吗？此操作将同时删除关联的执行日志，不可恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteScheduledTaskApi(row.id);
        message.success('删除成功');
        await fetchData();
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
}

// ==================== 启停 ====================
async function handleToggle(row: ScheduledTaskApi.ScheduledTask) {
  try {
    if (row.enabled === 1) {
      await disableTaskApi(row.id);
      message.success('已停用');
    } else {
      await enableTaskApi(row.id);
      message.success('已启用');
    }
    await fetchData();
  } catch {
    // 错误已被拦截器处理
  }
}

// ==================== 手动执行 ====================
function handleTrigger(row: ScheduledTaskApi.ScheduledTask) {
  dialog.warning({
    title: '确认执行',
    content: `确定要手动执行任务「${row.name}」吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await triggerTaskApi(row.id);
        message.success('任务已触发执行');
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
  fetchHandlers();
  fetchData();
});
</script>

<template>
  <div class="p-4">
    <NCard title="任务管理" :bordered="false" size="small">
      <TaskTable
        :data="dataSource"
        :loading="loading"
        :page="page"
        :page-size="pageSize"
        :total="total"
        :task-group-options="taskGroupOptions"
        @create="handleCreate"
        @edit="handleEdit"
        @delete="handleDelete"
        @toggle="handleToggle"
        @trigger="handleTrigger"
        @search="handleSearch"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </NCard>

    <TaskModal
      v-model:show="showModal"
      :mode="modalMode"
      :initial-values="editingTask"
      :handlers="handlers"
      :task-group-options="taskGroupOptions"
      @submit="handleSubmit"
    />
  </div>
</template>
