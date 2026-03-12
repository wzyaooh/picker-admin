<script lang="ts" setup>
import { ref, onMounted, reactive, computed, h } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { 
  NCard, 
  NButton, 
  NSpace, 
  NInput, 
  NSelect, 
  NTag, 
  NPopconfirm,
  NDataTable,
  NPagination,
  NModal,
  NAlert,
  NIcon
} from 'naive-ui';
import { message, dialog } from '#/adapter/naive';
import { IconifyIcon } from '@vben/icons';
import { 
  getApiKeyListApi, 
  deleteApiKeyApi, 
  toggleApiKeyApi,
  regenerateApiKeyApi,
  type ApiKeyApi 
} from '#/api/modules/api-key';
import ApiKeyModal from './components/ApiKeyModal.vue';
import ApiKeyDetailDrawer from './components/ApiKeyDetailDrawer.vue';

defineOptions({ name: 'ApiKeyManagePage' });

// 状态管理
const loading = ref(false);
const modalOpen = ref(false);
const drawerOpen = ref(false);
const editingId = ref<string | null>(null);
const viewingId = ref<string | null>(null);
const dataSource = ref<ApiKeyApi.ApiKey[]>([]);

// 重新生成相关状态
const regeneratedKey = ref<string>('');
const showRegeneratedKey = ref(false);
const regeneratingId = ref<string | null>(null);

// 分页状态
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

// 搜索条件
const searchForm = reactive({
  keyword: '',
  enabled: undefined as boolean | undefined,
});

// 状态选项
const enabledOptions = [
  { label: '启用', value: true },
  { label: '禁用', value: false },
];

// 表格列定义
const columns = computed((): DataTableColumns<ApiKeyApi.ApiKey> => [
  { title: '名称', key: 'name', minWidth: 160 },
  { title: '密钥前缀', key: 'keyPrefix', width: 120 },
  { 
    title: '描述', 
    key: 'description', 
    minWidth: 200,
    ellipsis: { tooltip: true },
    render: (row) => row.description || '-',
  },
  {
    title: '权限',
    key: 'permissions',
    width: 200,
    render: (row) => {
      if (!row.permissions || row.permissions.length === 0) {
        return '-';
      }
      
      // 获取权限的中文名称
      const getPermissionName = (code: string) => {
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
      };
      
      return h(NSpace, { size: 'small' }, {
        default: () => [
          ...row.permissions.slice(0, 2).map((permission: string) =>
            h(NTag, { size: 'small', type: 'info' }, { 
              default: () => getPermissionName(permission) 
            })
          ),
          ...(row.permissions.length > 2 ? [
            h(NTag, { size: 'small', type: 'default' }, { 
              default: () => `+${row.permissions.length - 2}` 
            })
          ] : [])
        ]
      });
    },
  },
  {
    title: '状态',
    key: 'enabled',
    width: 80,
    render: (row) =>
      h(NTag, { 
        type: row.enabled ? 'success' : 'default',
        size: 'small'
      }, { 
        default: () => row.enabled ? '启用' : '禁用' 
      }),
  },
  { 
    title: '限流', 
    key: 'rateLimit', 
    width: 80,
    render: (row) => `${row.rateLimit}/h`,
  },
  { 
    title: '最后使用', 
    key: 'lastUsedAt', 
    width: 160,
    render: (row) => {
      if (!row.lastUsedAt) return '从未使用';
      return new Date(row.lastUsedAt).toLocaleString('zh-CN');
    },
  },
  { 
    title: '过期时间', 
    key: 'expiresAt', 
    width: 160,
    render: (row) => {
      if (!row.expiresAt) return '永不过期';
      return new Date(row.expiresAt).toLocaleString('zh-CN');
    },
  },
  { 
    title: '创建时间', 
    key: 'createdAt', 
    width: 160,
    render: (row) => new Date(row.createdAt).toLocaleString('zh-CN'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, {
            size: 'small',
            type: 'info',
            onClick: () => handleView(row),
          }, { default: () => '详情' }),
          h(NButton, {
            size: 'small',
            type: 'primary',
            onClick: () => handleEdit(row),
          }, { default: () => '编辑' }),
          h(NButton, {
            size: 'small',
            type: 'success',
            loading: regeneratingId.value === row.id,
            onClick: () => handleRegenerate(row),
          }, { default: () => '重新生成' }),
          h(NButton, {
            size: 'small',
            type: row.enabled ? 'warning' : 'success',
            onClick: () => handleToggle(row),
          }, { default: () => row.enabled ? '禁用' : '启用' }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDelete(row),
          }, {
            trigger: () => h(NButton, {
              size: 'small',
              type: 'error',
            }, { default: () => '删除' }),
            default: () => '确定删除此 API Key 吗？',
          }),
        ],
      }),
  },
]);

// 获取数据
async function fetchData() {
  loading.value = true;
  try {
    const result = await getApiKeyListApi({
      pageNo: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      enabled: searchForm.enabled,
    });
    dataSource.value = result.pageData;
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

// 重置搜索
function handleReset() {
  searchForm.keyword = '';
  searchForm.enabled = undefined;
  pagination.page = 1;
  fetchData();
}

// 分页变化
function handlePageChange(page: number) {
  pagination.page = page;
  fetchData();
}

// 新增
function handleCreate() {
  editingId.value = null;
  modalOpen.value = true;
}

// 编辑
function handleEdit(row: ApiKeyApi.ApiKey) {
  editingId.value = row.id;
  modalOpen.value = true;
}

// 查看详情
function handleView(row: ApiKeyApi.ApiKey) {
  viewingId.value = row.id;
  drawerOpen.value = true;
}

// 启用/禁用
async function handleToggle(row: ApiKeyApi.ApiKey) {
  try {
    await toggleApiKeyApi(row.id, !row.enabled);
    message.success(row.enabled ? '已禁用' : '已启用');
    fetchData();
  } catch (error) {
    // 错误已被拦截器处理
  }
}

// 删除
function handleDelete(row: ApiKeyApi.ApiKey) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除 API Key「${row.name}」吗？此操作不可恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteApiKeyApi(row.id);
        message.success('删除成功');
        fetchData();
      } catch (error) {
        // 错误已被拦截器处理
      }
    },
  });
}

// 重新生成 API Key
function handleRegenerate(row: ApiKeyApi.ApiKey) {
  dialog.warning({
    title: '确认重新生成',
    content: `确定重新生成 API Key「${row.name}」吗？原密钥将失效，正在使用的应用需要更新密钥。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        regeneratingId.value = row.id;
        const result = await regenerateApiKeyApi(row.id);
        
        // 显示新生成的完整密钥
        regeneratedKey.value = result.fullKey;
        showRegeneratedKey.value = true;
        
        message.success('API Key 重新生成成功');
        fetchData();
      } catch (error) {
        // 错误已被拦截器处理
      } finally {
        regeneratingId.value = null;
      }
    },
  });
}

// 复制重新生成的 API Key
async function copyRegeneratedKey() {
  try {
    await navigator.clipboard.writeText(regeneratedKey.value);
    message.success('已复制到剪贴板');
  } catch (error) {
    message.error('复制失败，请手动复制');
  }
}

// 关闭重新生成的密钥显示
function closeRegeneratedKey() {
  showRegeneratedKey.value = false;
  regeneratedKey.value = '';
}

// 表单提交成功
function handleSubmitSuccess() {
  modalOpen.value = false;
  fetchData();
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="p-4">
    <NCard title="API Key 管理" :bordered="false">
      <!-- 搜索栏 -->
      <div class="mb-4">
        <NSpace>
          <NInput
            v-model:value="searchForm.keyword"
            placeholder="搜索名称或描述"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
          <NSelect
            v-model:value="searchForm.enabled as any"
            placeholder="状态"
            clearable
            style="width: 120px"
            :options="enabledOptions as any"
          />
          <NButton type="primary" @click="handleSearch">查询</NButton>
          <NButton @click="handleReset">重置</NButton>
          <NButton type="primary" @click="handleCreate">新增 API Key</NButton>
        </NSpace>
      </div>

      <!-- 表格 -->
      <NDataTable
        :columns="columns"
        :data="dataSource"
        :loading="loading"
        :row-key="(row: ApiKeyApi.ApiKey) => row.id"
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
    </NCard>

    <!-- 新增/编辑弹窗 -->
    <ApiKeyModal
      v-model:show="modalOpen"
      :editing-id="editingId"
      @submit="handleSubmitSuccess"
    />

    <!-- 详情抽屉 -->
    <ApiKeyDetailDrawer
      v-model:show="drawerOpen"
      :api-key-id="viewingId"
    />

    <!-- 重新生成密钥显示弹窗 -->
    <NModal
      v-model:show="showRegeneratedKey"
      preset="dialog"
      title="API Key 重新生成成功"
      :show-icon="false"
      :closable="false"
      style="width: 600px"
    >
      <div class="space-y-4">
        <NAlert type="success" title="重新生成成功">
          新的 API Key 已生成，请立即保存，关闭后将无法再次查看完整密钥。
        </NAlert>
        
        <div class="space-y-2">
          <div class="text-sm font-medium">完整 API Key：</div>
          <div class="flex items-center space-x-2">
            <NInput 
              :value="regeneratedKey" 
              readonly 
              class="flex-1"
              type="textarea"
              :rows="2"
              style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 12px;"
            />
            <NButton size="small" type="primary" @click="copyRegeneratedKey">
              <template #icon>
                <NIcon><IconifyIcon icon="lucide:copy" /></NIcon>
              </template>
              复制
            </NButton>
          </div>
        </div>
      </div>

      <template #action>
        <NButton type="primary" @click="closeRegeneratedKey">
          我已保存，关闭
        </NButton>
      </template>
    </NModal>
  </div>
</template>
