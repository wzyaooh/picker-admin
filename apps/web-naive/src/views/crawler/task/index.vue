<script lang="ts" setup>
/**
 * 爬虫任务管理页面
 *
 * 容器组件：管理状态、调用 API、协调 StatsCards + TaskTable + TaskModal
 */

import type { CrawlerApi } from '#/api/modules/crawler';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { NCard, NPagination, NAlert, NSpace, NButton, NIcon } from 'naive-ui';
import { IconifyIcon } from '@vben/icons';

import { dialog, message } from '#/adapter/naive';
import {
  clearDedupApi,
  createTaskApi,
  deleteTaskApi,
  getGlobalStatsApi,
  getTaskListApi,
  runTaskApi,
  stopTaskApi,
  updateTaskApi,
} from '#/api/modules/crawler';

import { useApiKeyStore } from '#/store';
import ApiKeyGlobalConfig from '#/components/ApiKeyGlobalConfig.vue';

import StatsCards from './components/StatsCards.vue';
import TaskModal from './components/TaskModal.vue';
import TaskTable from './components/TaskTable.vue';

defineOptions({ name: 'CrawlerTaskPage' });

const router = useRouter();
const apiKeyStore = useApiKeyStore();

// ==================== 状态管理 ====================

const loading = ref(false);
const dataSource = ref<CrawlerApi.CrawlTask[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const keyword = ref('');

// 统计
const statsLoading = ref(false);
const globalStats = ref<CrawlerApi.GlobalStats | null>(null);

// API Key配置
const showApiKeyConfig = ref(false);

// 弹窗
const modalOpen = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const modalInitialValues = ref<Partial<CrawlerApi.CrawlTask>>({});
const editingId = ref<null | string>(null);

// ==================== 数据获取 ====================

async function fetchTasks() {
  loading.value = true;
  try {
    const result = await getTaskListApi({
      pageNo: 1,
      pageSize: 100,
      keyword: keyword.value || undefined,
    });
    // 前端分页
    const start = (page.value - 1) * pageSize.value;
    dataSource.value = result.pageData.slice(start, start + pageSize.value);
    total.value = result.pageData.length;
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchStats() {
  statsLoading.value = true;
  try {
    globalStats.value = await getGlobalStatsApi();
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  } finally {
    statsLoading.value = false;
  }
}

onMounted(() => {
  // 初始化时恢复API Key配置并加载数据
  apiKeyStore.restoreFromStorage();
  fetchTasks();
  fetchStats();
});

// ==================== 弹窗管理 ====================

function openCreate() {
  modalMode.value = 'create';
  editingId.value = null;
  modalInitialValues.value = {};
  modalOpen.value = true;
}

function openEdit(row: CrawlerApi.CrawlTask) {
  modalMode.value = 'edit';
  editingId.value = row.id;
  modalInitialValues.value = { ...row };
  modalOpen.value = true;
}

async function handleSubmit(
  values: CrawlerApi.CreateTaskParams | CrawlerApi.UpdateTaskParams,
) {
  try {
    if (modalMode.value === 'create') {
      await createTaskApi(values as CrawlerApi.CreateTaskParams);
      message.success('创建成功');
    } else {
      if (!editingId.value) return;
      await updateTaskApi(
        editingId.value,
        values as CrawlerApi.UpdateTaskParams,
      );
      message.success('更新成功');
    }
    modalOpen.value = false;
    await fetchTasks();
    await fetchStats();
  } catch {
    // 错误已被拦截器处理
  }
}

// ==================== 操作处理 ====================

async function handleRun(row: CrawlerApi.CrawlTask) {
  try {
    await runTaskApi(row.id);
    message.success('任务已启动');
    setTimeout(() => {
      fetchTasks();
      fetchStats();
    }, 1000);
  } catch {
    // 错误已被拦截器处理
  }
}

async function handleStop(row: CrawlerApi.CrawlTask) {
  try {
    const result = await stopTaskApi(row.id);
    // 如果后端直接强制停止了（线程已崩溃的情况），立即刷新
    if (result?.forced) {
      message.success('任务已停止');
      await fetchTasks();
      await fetchStats();
      return;
    }
    message.success('已发送停止指令');
    // 轮询等待状态变化（最多 5 秒）
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      await fetchTasks();
      const updated = dataSource.value.find((t) => t.id === row.id);
      if (!updated || updated.status !== 'running') {
        clearInterval(poll);
        fetchStats();
      } else if (attempts >= 5) {
        // 5 秒后仍在运行，自动强制停止
        clearInterval(poll);
        try {
          await stopTaskApi(row.id, true);
          message.success('任务已强制停止');
          await fetchTasks();
          await fetchStats();
        } catch {
          // 错误已被拦截器处理
        }
      }
    }, 1000);
  } catch {
    // 错误已被拦截器处理
  }
}

function handleDelete(row: CrawlerApi.CrawlTask) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除任务「${row.name}」吗？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteTaskApi(row.id);
        message.success('删除成功');
        await fetchTasks();
        await fetchStats();
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
}

function handleClearDedup(row: CrawlerApi.CrawlTask) {
  dialog.warning({
    title: '清除去重记录',
    content: `确定清除任务「${row.name}」的去重记录吗？清除后该任务可重新爬取已爬过的 URL。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await clearDedupApi(row.id);
        message.success('去重记录已清除');
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
}

function handleViewResults(row: CrawlerApi.CrawlTask) {
  router.push({
    path: '/crawler/result',
    query: { taskId: row.id, taskName: row.name },
  });
}

function handleSearch(kw: string) {
  keyword.value = kw;
  page.value = 1;
  fetchTasks();
}

function handleRefresh() {
  fetchTasks();
  fetchStats();
}

// 初始化时恢复API Key配置
onMounted(() => {
  apiKeyStore.restoreFromStorage();
});
</script>

<template>
  <div class="p-4">
    <!-- API Key 状态提示 -->
    <div class="mb-4">
      <NAlert
        v-if="!apiKeyStore.hasSelectedApiKey"
        type="warning"
        :show-icon="false"
        closable
      >
        <template #header>
          <NSpace align="center">
            <span>未配置 API Key</span>
            <NButton size="small" type="primary" @click="showApiKeyConfig = true">
              立即配置
            </NButton>
          </NSpace>
        </template>
        请配置 API Key 以访问爬虫服务。没有 API Key 将无法调用爬虫接口。
      </NAlert>
      
      <NAlert
        v-else-if="!apiKeyStore.isApiKeyValid"
        type="error"
        :show-icon="false"
        closable
      >
        <template #header>
          <NSpace align="center">
            <span>API Key 无效</span>
            <NButton size="small" type="primary" @click="showApiKeyConfig = true">
              重新配置
            </NButton>
          </NSpace>
        </template>
        当前 API Key 已禁用或过期，请重新配置。
      </NAlert>
      
      <NAlert
        v-else
        type="success"
        :show-icon="false"
        closable
      >
        <template #header>
          <NSpace align="center">
            <span>API Key 已配置</span>
            <NButton size="small" @click="showApiKeyConfig = true">
              <template #icon>
                <NIcon><IconifyIcon icon="lucide:settings" /></NIcon>
              </template>
              管理
            </NButton>
          </NSpace>
        </template>
        当前使用: {{ apiKeyStore.selectedApiKeyInfo?.name }} | 
        权限: {{ apiKeyStore.selectedApiKeyInfo?.permissions.length }} 项
      </NAlert>
    </div>

    <!-- 统计卡片 -->
    <div class="mb-4">
      <StatsCards :stats="globalStats" :loading="statsLoading" />
    </div>

    <NCard title="任务管理" :bordered="false" size="small">
      <!-- 任务表格 -->
      <TaskTable
        :data="dataSource"
        :loading="loading"
        @create="openCreate"
        @edit="openEdit"
        @run="handleRun"
        @stop="handleStop"
        @view-results="handleViewResults"
        @clear-dedup="handleClearDedup"
        @delete="handleDelete"
        @search="handleSearch"
        @refresh="handleRefresh"
      />

      <!-- 分页 -->
      <div class="mt-3 flex justify-end">
        <NPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page="fetchTasks"
          @update:page-size="fetchTasks"
        />
      </div>
    </NCard>

    <!-- 任务弹窗 -->
    <TaskModal
      v-model:show="modalOpen"
      :mode="modalMode"
      :initial-values="modalInitialValues"
      @submit="handleSubmit"
    />
    
    <!-- API Key 配置弹窗 -->
    <ApiKeyGlobalConfig
      v-model:show="showApiKeyConfig"
    />
  </div>
</template>
