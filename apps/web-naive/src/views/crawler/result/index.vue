<script lang="ts" setup>
import type { CrawlerApi } from '#/api/modules/crawler';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  NButton,
  NCard,
  NGrid,
  NGridItem,
  NInput,
  NPagination,
  NSelect,
  NSpace,
  NStatistic,
} from 'naive-ui';

import { dialog, message } from '#/adapter/naive';
import {
  clearEnrichStatusApi,
  clearResultsApi,
  deleteEnrichedApi,
  deleteEnrichedByTaskApi,
  deleteSingleResultApi,
  enrichSingleApi,
  enrichTaskApi,
  getAllResultsApi,
  getEnrichedResultApi,
  getEnrichStatusMapApi,
  getTaskListApi,
  getTaskResultsApi,
  getTaskStatsApi,
  isEnrichingApi,
  isSingleEnrichingApi,
  stopEnrichSingleApi,
  stopEnrichTaskApi,
} from '#/api/modules/crawler';

import EnrichDrawer from './components/EnrichDrawer.vue';
import ResultDrawer from './components/ResultDrawer.vue';
import ResultTable from './components/ResultTable.vue';

defineOptions({ name: 'CrawlerResultPage' });

const route = useRoute();
const router = useRouter();

const taskId = computed(() => (route.query.taskId as string) || '');
const taskName = computed(() => (route.query.taskName as string) || '');

// 是否为「全部结果」模式（无 taskId 参数时）
const isAllMode = computed(() => !taskId.value);

// 搜索条件
const searchTaskId = ref<null | string>(null);
const searchKeyword = ref('');

// 任务选项列表（全部模式下的下拉选择）
const taskOptions = ref<Array<{ label: string; value: string }>>([]);

async function fetchTaskOptions() {
  try {
    const result = await getTaskListApi({ pageNo: 1, pageSize: 500 });
    taskOptions.value = result.pageData.map((t) => ({
      label: `${t.name}`,
      value: t.id,
    }));
  } catch {
    // 静默
  }
}

function handleRefresh() {
  fetchResults();
  if (isAllMode.value) {
    fetchTaskOptions();
  } else {
    fetchStats();
    fetchEnrichStatus();
    checkEnriching();
  }
}

// 结果列表状态
const loading = ref(false);
const dataSource = ref<(CrawlerApi.CrawlResult & { taskName?: string })[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

// 任务统计（仅单任务模式）
const statsLoading = ref(false);
const taskStats = ref<CrawlerApi.TaskStats | null>(null);

// 预览抽屉
const drawerShow = ref(false);
const previewResult = ref<CrawlerApi.CrawlResult | null>(null);

// AI 增强抽屉
const enrichDrawerShow = ref(false);
const enrichLoading = ref(false);
const enrichedData = ref<CrawlerApi.EnrichedResult | null>(null);

// AI 增强状态映射 { resultId: status }
const enrichStatusMap = ref<Record<string, string>>({});
const enrichingTask = ref(false);
let enrichPollTimer: ReturnType<typeof setInterval> | null = null;

async function fetchResults() {
  loading.value = true;
  try {
    if (isAllMode.value) {
      // 全部结果模式：使用新接口，支持按任务ID/名称筛选
      const result = await getAllResultsApi({
        pageNo: page.value,
        pageSize: pageSize.value,
        taskId: searchTaskId.value || undefined,
        keyword: searchKeyword.value || undefined,
      });
      dataSource.value = result.pageData;
      total.value = result.total;
    } else {
      // 单任务模式：使用原有接口
      const result = await getTaskResultsApi(taskId.value, {
        pageNo: page.value,
        pageSize: pageSize.value,
      });
      dataSource.value = result.pageData;
      total.value = result.total;
    }
  } catch (error) {
    console.error('Failed to fetch results:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchEnrichStatus() {
  if (!taskId.value) return;
  try {
    enrichStatusMap.value = await getEnrichStatusMapApi(taskId.value);
  } catch {
    // 非关键请求，静默失败
  }
}

async function fetchStats() {
  if (!taskId.value) return;
  statsLoading.value = true;
  try {
    taskStats.value = await getTaskStatsApi(taskId.value);
  } catch (error) {
    console.error('Failed to fetch task stats:', error);
  } finally {
    statsLoading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  fetchResults();
}

function handleReset() {
  searchTaskId.value = null;
  searchKeyword.value = '';
  page.value = 1;
  fetchResults();
}

function goBack() {
  router.push('/crawler/task');
}

function handlePreview(row: CrawlerApi.CrawlResult) {
  previewResult.value = row;
  drawerShow.value = true;
}

function handleClearResults() {
  dialog.warning({
    title: '清除爬取结果',
    content: `确定清除「${taskName.value || taskId.value}」的所有爬取结果吗？此操作不可恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const result = await clearResultsApi(taskId.value);
        message.success(`已清除 ${result.deleted} 条爬取结果`);
        await fetchResults();
        await fetchStats();
        await fetchEnrichStatus();
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
}

// 单条增强中的 resultId
const enrichingResultId = ref<null | string>(null);
let singleEnrichPollTimer: ReturnType<typeof setInterval> | null = null;

async function handleEnrich(row: CrawlerApi.CrawlResult) {
  enrichedData.value = null;
  enrichLoading.value = true;
  enrichDrawerShow.value = true;
  enrichingResultId.value = row.id;

  try {
    await enrichSingleApi(row.id);
    startSingleEnrichPoll(row.id);
  } catch {
    enrichLoading.value = false;
    enrichingResultId.value = null;
  }
}

function startSingleEnrichPoll(resultId: string) {
  stopSingleEnrichPoll();
  singleEnrichPollTimer = setInterval(async () => {
    try {
      const { enriching } = await isSingleEnrichingApi(resultId);
      fetchEnrichStatus();
      if (!enriching) {
        stopSingleEnrichPoll();
        try {
          const result = await getEnrichedResultApi(resultId);
          enrichedData.value = result;
          if (result.status === 'success') {
            message.success('AI 增强完成');
          } else if (result.errorMsg === '用户取消') {
            message.info('增强已取消');
          } else {
            message.error(result.errorMsg || '增强失败');
          }
        } catch {
          // 可能还没有增强记录
        }
        enrichLoading.value = false;
        enrichingResultId.value = null;
      }
    } catch {
      // 轮询失败，静默
    }
  }, 3000);
}

function stopSingleEnrichPoll() {
  if (singleEnrichPollTimer) {
    clearInterval(singleEnrichPollTimer);
    singleEnrichPollTimer = null;
  }
}

async function handleStopSingleEnrich() {
  if (!enrichingResultId.value) return;
  try {
    await stopEnrichSingleApi(enrichingResultId.value);
    message.info('停止信号已发送，当前步骤完成后将停止');
  } catch {
    // 错误已被拦截器处理
  }
}

async function handleClearEnrichStatus(resultId: string) {
  dialog.warning({
    title: '清理增强状态',
    content: '此操作将清理卡住的增强状态，允许重新开始增强。确定继续吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const result = await clearEnrichStatusApi(resultId);
        message.success(result.message || '状态已清理');
        await fetchEnrichStatus();
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
}

async function handleStopSingleEnrichFromTable(row: CrawlerApi.CrawlResult) {
  try {
    await stopEnrichSingleApi(row.id);
    message.info('停止信号已发送');
    setTimeout(() => fetchEnrichStatus(), 2000);
  } catch {
    // 错误已被拦截器处理
  }
}

async function handleViewEnrich(row: CrawlerApi.CrawlResult) {
  enrichedData.value = null;
  enrichLoading.value = true;
  enrichDrawerShow.value = true;

  try {
    const existing = await getEnrichedResultApi(row.id);
    enrichedData.value = existing;
  } catch {
    // 错误已被拦截器处理
  } finally {
    enrichLoading.value = false;
  }
}

async function handleEnrichAll() {
  dialog.warning({
    title: 'AI 批量增强',
    content: `确定对「${taskName.value || taskId.value}」的所有成功结果进行 AI 增强吗？这可能需要较长时间。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      enrichingTask.value = true;
      startEnrichPoll();
      try {
        const result = await enrichTaskApi(taskId.value);
        const msg = result.cancelled
          ? `增强已取消：成功 ${result.success}，失败 ${result.failed}，跳过 ${result.skipped}`
          : `增强完成：成功 ${result.success}，失败 ${result.failed}，跳过 ${result.skipped}`;
        message.success(msg);
        fetchEnrichStatus();
      } catch {
        // 错误已被拦截器处理
      } finally {
        enrichingTask.value = false;
        stopEnrichPoll();
      }
    },
  });
}

async function handleStopEnrich() {
  try {
    await stopEnrichTaskApi(taskId.value);
    message.info('停止信号已发送，当前项目增强完成后将停止');
  } catch {
    // 错误已被拦截器处理
  }
}

function startEnrichPoll() {
  stopEnrichPoll();
  enrichPollTimer = setInterval(() => {
    fetchEnrichStatus();
  }, 5000);
}

function stopEnrichPoll() {
  if (enrichPollTimer) {
    clearInterval(enrichPollTimer);
    enrichPollTimer = null;
  }
}

async function checkEnriching() {
  if (!taskId.value) return;
  try {
    const result = await isEnrichingApi(taskId.value);
    enrichingTask.value = result.enriching;
    if (result.enriching) {
      startEnrichPoll();
    }
  } catch {
    // 静默
  }
}

function handleDeleteResult(row: CrawlerApi.CrawlResult) {
  dialog.warning({
    title: '删除爬取结果',
    content: `确定删除「${row.title || row.url}」吗？关联的 AI 增强结果也会一并删除。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteSingleResultApi(row.id);
        message.success('删除成功');
        await fetchResults();
        if (!isAllMode.value) {
          await fetchStats();
          await fetchEnrichStatus();
        }
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
}

function handleDeleteEnrich(row: CrawlerApi.CrawlResult) {
  dialog.warning({
    title: '删除 AI 增强',
    content: `确定删除「${row.title || row.url}」的 AI 增强结果吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const enriched = await getEnrichedResultApi(row.id).catch(() => null);
        if (enriched?.id) {
          await deleteEnrichedApi(enriched.id);
          message.success('AI 增强结果已删除');
          await fetchEnrichStatus();
        } else {
          message.warning('未找到增强结果');
        }
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
}

function handleClearAllEnrich() {
  dialog.warning({
    title: '批量清除 AI 增强',
    content: `确定清除「${taskName.value || taskId.value}」的所有 AI 增强结果吗？此操作不可恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const result = await deleteEnrichedByTaskApi(taskId.value);
        message.success(`已清除 ${result.deleted} 条增强结果`);
        await fetchEnrichStatus();
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
}

// 监听路由参数变化
watch(taskId, () => {
  page.value = 1;
  searchTaskId.value = null;
  searchKeyword.value = '';
  fetchResults();
  if (!isAllMode.value) {
    fetchStats();
    fetchEnrichStatus();
    checkEnriching();
  }
});

onMounted(() => {
  // 移除自动调用爬虫接口，改为用户主动刷新时调用
  fetchResults();
  if (isAllMode.value) {
    fetchTaskOptions();
  } else {
    fetchStats();
    fetchEnrichStatus();
    checkEnriching();
  }
});

onUnmounted(() => {
  stopEnrichPoll();
  stopSingleEnrichPoll();
});
</script>

<template>
  <div class="p-4">
    <!-- 任务统计卡片（仅单任务模式显示） -->
    <div v-if="!isAllMode" class="mb-4">
      <NGrid :cols="5" :x-gap="16">
        <NGridItem>
          <NCard :bordered="false" size="small">
            <NStatistic label="执行次数" :value="taskStats?.totalRuns ?? 0" />
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard :bordered="false" size="small">
            <NStatistic
              label="成功次数"
              :value="taskStats?.successCount ?? 0"
            />
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard :bordered="false" size="small">
            <NStatistic label="失败次数" :value="taskStats?.failCount ?? 0" />
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard :bordered="false" size="small">
            <NStatistic label="总条目数" :value="taskStats?.totalItems ?? 0" />
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard :bordered="false" size="small">
            <NStatistic 
              label="最近耗时" 
              :value="taskStats?.lastElapsedMs ? (taskStats.lastElapsedMs / 1000).toFixed(1) : 0"
            >
              <template #suffix>s</template>
            </NStatistic>
          </NCard>
        </NGridItem>
      </NGrid>
    </div>

    <NCard :bordered="false" size="small">
      <template #header>
        <div class="flex items-center gap-3">
          <NButton size="small" @click="goBack">← 返回</NButton>
          <span>{{
            isAllMode
              ? '爬取结果'
              : taskName
                ? `${taskName} - 爬取结果`
                : '爬取结果'
          }}</span>
          <div v-if="!isAllMode" class="ml-auto">
            <NSpace :size="8">
              <NButton
                v-if="enrichingTask"
                size="small"
                type="error"
                @click="handleStopEnrich"
              >
                停止增强
              </NButton>
              <NButton
                v-else
                size="small"
                type="warning"
                :disabled="total === 0"
                @click="handleEnrichAll"
              >
                AI 批量增强
              </NButton>
              <NButton
                size="small"
                type="error"
                ghost
                :disabled="Object.keys(enrichStatusMap).length === 0"
                @click="handleClearAllEnrich"
              >
                清除所有增强
              </NButton>
              <NButton
                size="small"
                type="error"
                :disabled="total === 0"
                @click="handleClearResults"
              >
                清除结果
              </NButton>
            </NSpace>
          </div>
        </div>
      </template>

      <!-- 搜索栏（全部结果模式） -->
      <div v-if="isAllMode" class="mb-3 flex items-center gap-3">
        <NSelect
          v-model:value="searchTaskId"
          placeholder="选择任务"
          clearable
          filterable
          size="small"
          style="width: 240px"
          :options="taskOptions"
        />
        <NInput
          v-model:value="searchKeyword"
          placeholder="关键字（标题 / URL）"
          clearable
          size="small"
          style="width: 220px"
          @keyup.enter="handleSearch"
        />
        <NButton size="small" type="primary" @click="handleSearch">
          查询
        </NButton>
        <NButton size="small" @click="handleReset">重置</NButton>
        <NButton size="small" @click="handleRefresh">刷新</NButton>
      </div>

      <ResultTable
        :data="dataSource"
        :loading="loading"
        :enrich-status-map="enrichStatusMap"
        :show-task-name="isAllMode"
        @preview="handlePreview"
        @enrich="handleEnrich"
        @view-enrich="handleViewEnrich"
        @delete-result="handleDeleteResult"
        @delete-enrich="handleDeleteEnrich"
        @stop-enrich="handleStopSingleEnrichFromTable"
        @clear-status="(row) => handleClearEnrichStatus(row.id)"
      />

      <div class="mt-3 flex justify-end">
        <NPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page="fetchResults"
          @update:page-size="fetchResults"
        />
      </div>
    </NCard>

    <!-- 结果预览抽屉 -->
    <ResultDrawer
      v-model:show="drawerShow"
      :result="previewResult"
    />

    <!-- AI 增强结果抽屉 -->
    <EnrichDrawer
      v-model:show="enrichDrawerShow"
      :data="enrichedData"
      :loading="enrichLoading"
      :can-stop="!!enrichingResultId"
      @stop="handleStopSingleEnrich"
    />
  </div>
</template>
