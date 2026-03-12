<script lang="ts" setup>
import { ref, watch, computed, h } from 'vue';
import { 
  NDrawer, 
  NDrawerContent, 
  NDescriptions, 
  NDescriptionsItem, 
  NTag, 
  NSpace, 
  NButton, 
  NCard,
  NStatistic,
  NGrid,
  NGridItem,
  NDataTable,
  NIcon,
  NInput,
  NAlert,
} from 'naive-ui';
import { IconifyIcon } from '@vben/icons';
import { message, dialog } from '#/adapter/naive';
import type { DataTableColumns } from 'naive-ui';
import { 
  getApiKeyApi, 
  getApiKeyStatsApi,
  getAccessLogsApi,
  regenerateApiKeyApi,
  type ApiKeyApi 
} from '#/api/modules/api-key';

interface Props {
  show: boolean;
  apiKeyId?: string | null;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const loading = ref(false);
const statsLoading = ref(false);
const logsLoading = ref(false);
const apiKeyData = ref<ApiKeyApi.ApiKey | null>(null);
const statsData = ref<ApiKeyApi.UsageStats | null>(null);
const logsData = ref<ApiKeyApi.AccessLog[]>([]);
const logsTotal = ref(0);
const logsPage = ref(1);
const logsPageSize = ref(10);
const regeneratedKey = ref('');
const showRegeneratedKey = ref(false);

// 访问日志表格列配置
const logColumns: DataTableColumns<ApiKeyApi.AccessLog> = [
  { 
    title: '时间', 
    key: 'createdAt', 
    width: 160,
    render: (row) => new Date(row.createdAt).toLocaleString(),
  },
  { title: '方法', key: 'method', width: 80 },
  { 
    title: '路径', 
    key: 'path', 
    minWidth: 200,
    ellipsis: { tooltip: true },
  },
  { 
    title: '状态码', 
    key: 'statusCode', 
    width: 80,
    render: (row) => {
      const type = row.statusCode >= 400 ? 'error' : 
                   row.statusCode >= 300 ? 'warning' : 'success';
      return h(NTag, { type, size: 'small' }, { default: () => row.statusCode });
    },
  },
  { 
    title: '响应时间', 
    key: 'responseTime', 
    width: 100,
    render: (row) => `${row.responseTime}ms`,
  },
  { 
    title: 'IP 地址', 
    key: 'ipAddress', 
    width: 120,
    ellipsis: { tooltip: true },
  },
];

const isExpired = computed(() => {
  if (!apiKeyData.value?.expiresAt) return false;
  return new Date(apiKeyData.value.expiresAt) < new Date();
});

// 获取权限的中文名称
function getPermissionName(code: string) {
  const permissionMap: Record<string, string> = {
    'crawler:*': '爬虫全部权限',
    'crawler:task:list': '查看任务列表',
    'crawler:task:detail': '查看任务详情',
    'crawler:task:create': '创建任务',
    'crawler:task:update': '更新任务',
    'crawler:task:delete': '删除任务',
    'crawler:task:run': '执行任务',
    'crawler:task:stop': '停止任务',
    'crawler:result:list': '查看结果列表',
    'crawler:result:task': '查看任务结果',
    'crawler:result:delete': '删除单个结果',
    'crawler:result:clear': '清空任务结果',
    'crawler:result:dedup': '清空去重缓存',
    'crawler:spider:list': '查看爬虫列表',
    'crawler:spider:test': '测试爬虫',
    'crawler:article:list': '查看文章列表',
    'crawler:article:detail': '查看文章详情',
    'crawler:article:by-result': '根据结果查看文章',
    'crawler:article:by-task': '查看任务文章',
    'crawler:article:versions': '查看文章版本',
    'crawler:article:delete': '删除文章',
    'crawler:article:delete-task': '删除任务文章',
    'crawler:article:polish': '文章润色',
    'crawler:article:polish-status': '查看润色状态',
    'crawler:article:set-latest': '设置最新版本',
    'crawler:enrich:single': '单条结果增强',
    'crawler:enrich:task': '批量任务增强',
    'crawler:enrich:get': '获取增强结果',
    'crawler:enrich:list': '获取增强列表',
    'crawler:enrich:status': '查看增强状态',
    'crawler:enrich:single-status': '查看单条增强状态',
    'crawler:enrich:task-status': '查看任务增强状态',
    'crawler:enrich:stop-single': '停止单条增强',
    'crawler:enrich:stop-task': '停止批量增强',
    'crawler:enrich:delete': '删除增强结果',
    'crawler:enrich:delete-task': '删除任务增强',
    'crawler:stats:global': '全局统计',
    'crawler:stats:task': '任务统计',
  };
  return permissionMap[code] || code;
}

// 监听抽屉显示状态
watch(() => props.show, (newVal) => {
  if (newVal && props.apiKeyId) {
    loadApiKeyData();
    loadStatsData();
    loadLogsData();
  } else {
    // 重置状态
    showRegeneratedKey.value = false;
    regeneratedKey.value = '';
  }
});

// 加载 API Key 数据
async function loadApiKeyData() {
  if (!props.apiKeyId) return;
  
  try {
    loading.value = true;
    apiKeyData.value = await getApiKeyApi(props.apiKeyId);
  } catch (error) {
    // 错误已被拦截器处理
  } finally {
    loading.value = false;
  }
}

// 加载统计数据
async function loadStatsData() {
  if (!props.apiKeyId) return;
  
  try {
    statsLoading.value = true;
    statsData.value = await getApiKeyStatsApi(props.apiKeyId);
  } catch (error) {
    console.error('Failed to load stats:', error);
  } finally {
    statsLoading.value = false;
  }
}

// 加载访问日志
async function loadLogsData() {
  if (!props.apiKeyId) return;
  
  try {
    logsLoading.value = true;
    const result = await getAccessLogsApi({
      apiKeyId: props.apiKeyId,
      pageNo: logsPage.value,
      pageSize: logsPageSize.value,
    });
    logsData.value = result.pageData;
    logsTotal.value = result.total;
  } catch (error) {
    console.error('Failed to load logs:', error);
  } finally {
    logsLoading.value = false;
  }
}

// 刷新统计数据
function handleRefreshStats() {
  loadStatsData();
}

// 重新生成 API Key
function handleRegenerate() {
  if (!props.apiKeyId || !apiKeyData.value) return;
  
  dialog.warning({
    title: '确认重新生成',
    content: `确定重新生成 API Key「${apiKeyData.value.name}」吗？旧的密钥将立即失效。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const result = await regenerateApiKeyApi(props.apiKeyId!);
        regeneratedKey.value = result.fullKey;
        showRegeneratedKey.value = true;
        message.success('重新生成成功');
        
        // 刷新数据
        loadApiKeyData();
        loadStatsData();
      } catch (error) {
        // 错误已被拦截器处理
      }
    },
  });
}

// 复制新生成的 API Key
async function copyRegeneratedKey() {
  try {
    await navigator.clipboard.writeText(regeneratedKey.value);
    message.success('已复制到剪贴板');
  } catch (error) {
    message.error('复制失败，请手动复制');
  }
}

// 关闭重新生成的密钥显示
function handleCloseRegeneratedKey() {
  showRegeneratedKey.value = false;
  regeneratedKey.value = '';
}

// 分页变化
function handlePageChange(page: number) {
  logsPage.value = page;
  loadLogsData();
}
</script>

<template>
  <NDrawer
    :show="show"
    :width="800"
    placement="right"
    @update:show="emit('update:show', $event)"
  >
    <NDrawerContent title="API Key 详情" closable>
      <div v-if="loading" class="flex justify-center py-8">
        加载中...
      </div>
      
      <div v-else-if="apiKeyData" class="space-y-6">
        <!-- 重新生成的密钥提示 -->
        <NAlert
          v-if="showRegeneratedKey"
          type="success"
          title="API Key 重新生成成功"
          closable
          @close="handleCloseRegeneratedKey"
        >
          <div class="space-y-2">
            <div>请立即保存新的 API Key，关闭后将无法再次查看完整密钥。</div>
            <div class="flex items-center space-x-2">
              <NInput 
                :value="regeneratedKey" 
                readonly 
                type="textarea"
                :rows="2"
                class="flex-1"
                style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 12px;"
              />
              <NButton size="small" @click="copyRegeneratedKey">
                复制
                <template #icon>
                  <NIcon><IconifyIcon icon="lucide:copy" /></NIcon>
                </template>
              </NButton>
            </div>
          </div>
        </NAlert>

        <!-- 基本信息 -->
        <NCard title="基本信息" size="small">
          <NDescriptions :column="2" label-placement="left">
            <NDescriptionsItem label="名称">
              {{ apiKeyData.name }}
            </NDescriptionsItem>
            <NDescriptionsItem label="密钥前缀">
              <NInput 
                :value="apiKeyData.keyPrefix" 
                readonly 
                size="small"
                style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 12px; width: 200px;"
              />
            </NDescriptionsItem>
            <NDescriptionsItem label="状态">
              <NSpace>
                <NTag :type="apiKeyData.enabled ? 'success' : 'default'">
                  {{ apiKeyData.enabled ? '启用' : '禁用' }}
                </NTag>
                <NTag v-if="isExpired" type="error">已过期</NTag>
              </NSpace>
            </NDescriptionsItem>
            <NDescriptionsItem label="限流">
              {{ apiKeyData.rateLimit }} 次/小时
            </NDescriptionsItem>
            <NDescriptionsItem label="创建时间">
              {{ new Date(apiKeyData.createdAt).toLocaleString() }}
            </NDescriptionsItem>
            <NDescriptionsItem label="最后使用">
              {{ apiKeyData.lastUsedAt ? new Date(apiKeyData.lastUsedAt).toLocaleString() : '从未使用' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="过期时间">
              {{ apiKeyData.expiresAt ? new Date(apiKeyData.expiresAt).toLocaleString() : '永不过期' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="描述" :span="2">
              {{ apiKeyData.description || '无' }}
            </NDescriptionsItem>
          </NDescriptions>
        </NCard>

        <!-- 权限列表 -->
        <NCard title="权限列表" size="small">
          <NSpace>
            <NTag
              v-for="permission in apiKeyData.permissions"
              :key="permission"
              type="info"
            >
              {{ getPermissionName(permission) }}
            </NTag>
          </NSpace>
        </NCard>

        <!-- 使用统计 -->
        <NCard title="使用统计" size="small">
          <template #header-extra>
            <NButton
              size="small"
              :loading="statsLoading"
              @click="handleRefreshStats"
            >
              刷新
              <template #icon>
                <NIcon><IconifyIcon icon="lucide:refresh-cw" /></NIcon>
              </template>
            </NButton>
          </template>
          
          <NGrid v-if="statsData" :cols="4" :x-gap="16">
            <NGridItem>
              <NStatistic label="总请求数" :value="statsData.totalRequests" />
            </NGridItem>
            <NGridItem>
              <NStatistic label="今日请求" :value="statsData.todayRequests" />
            </NGridItem>
            <NGridItem>
              <NStatistic label="最近1小时" :value="statsData.lastHourRequests" />
            </NGridItem>
            <NGridItem>
              <NStatistic 
                label="平均响应时间" 
                :value="statsData.avgResponseTime" 
                suffix="ms"
              />
            </NGridItem>
          </NGrid>
          
          <div v-else-if="statsLoading" class="text-center py-4">
            加载统计数据中...
          </div>
          
          <div v-else class="text-center py-4 text-gray-500">
            暂无统计数据
          </div>
        </NCard>

        <!-- 访问日志 -->
        <NCard title="访问日志" size="small">
          <NDataTable
            :columns="logColumns"
            :data="logsData"
            :loading="logsLoading"
            :pagination="{
              page: logsPage,
              pageSize: logsPageSize,
              itemCount: logsTotal,
              showSizePicker: true,
              pageSizes: [10, 20, 50],
              onUpdatePage: handlePageChange,
              onUpdatePageSize: (size: number) => {
                logsPageSize = size;
                logsPage = 1;
                loadLogsData();
              },
            }"
            size="small"
          />
        </NCard>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="emit('update:show', false)">关闭</NButton>
          <NButton
            v-if="apiKeyData"
            type="warning"
            @click="handleRegenerate"
          >
            重新生成密钥
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
