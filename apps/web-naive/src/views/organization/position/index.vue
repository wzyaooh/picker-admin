<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui';

import { computed, h, onMounted, ref } from 'vue';

import {
  NButton,
  NCard,
  NDataTable,
  NInput,
  NPagination,
  NSpace,
  NTag,
} from 'naive-ui';

import { dialog, message } from '#/adapter/naive';

import {
  createPositionApi,
  deletePositionApi,
  getPositionListApi,
  updatePositionApi,
  type PositionApi,
} from '#/api';

import PositionModal from './positionModal.vue';

defineOptions({ name: 'OrganizationPositionPage' });

const keyword = ref('');
const loading = ref(false);

const dataSource = ref<PositionApi.Position[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

// Fetch positions from backend
async function fetchPositions() {
  loading.value = true;
  try {
    const result = await getPositionListApi({
      pageNo: page.value,
      pageSize: pageSize.value,
      name: keyword.value || undefined,
    });
    dataSource.value = result.pageData;
    total.value = result.total;
  } catch (error) {
    console.error('Failed to fetch positions:', error);
  } finally {
    loading.value = false;
  }
}

// Load positions on mount
onMounted(() => {
  fetchPositions();
});

const checkedRowKeys = ref<number[]>([]);

// Modal state
const modalOpen = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const modalInitialValues = ref<{
  code?: string;
  name?: string;
  description?: string;
  sort?: number;
  enable?: boolean;
}>({});
const originalCode = ref<string | undefined>(undefined);
const editingId = ref<number | null>(null);

const existingCodes = computed(() => dataSource.value?.map((p) => p.code) || []);

function openCreate() {
  modalMode.value = 'create';
  editingId.value = null;
  originalCode.value = undefined;
  modalInitialValues.value = {
    code: '',
    name: '',
    description: '',
    sort: 0,
    enable: true,
  };
  modalOpen.value = true;
}

function openEdit(row: PositionApi.Position) {
  modalMode.value = 'edit';
  editingId.value = row.id;
  originalCode.value = row.code;
  modalInitialValues.value = {
    code: row.code,
    name: row.name,
    description: row.description,
    sort: row.sort,
    enable: row.enable,
  };
  modalOpen.value = true;
}

async function handlePositionSubmit(values: {
  code: string;
  name: string;
  description: string;
  sort: number;
  enable: boolean;
}) {
  try {
    if (modalMode.value === 'create') {
      await createPositionApi({
        code: values.code,
        name: values.name,
        description: values.description,
        sort: values.sort,
        enable: values.enable,
      });
      message.success('新增成功');
    } else {
      const id = editingId.value;
      if (!id) return;
      
      await updatePositionApi(id, {
        code: values.code,
        name: values.name,
        description: values.description,
        sort: values.sort,
        enable: values.enable,
      });
      message.success('保存成功');
    }
    
    modalOpen.value = false;
    await fetchPositions();
  } catch (error) {
    // Error already handled by interceptor
  }
}

function handleDelete(row: PositionApi.Position) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除岗位「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deletePositionApi(row.id);
        message.success('删除成功');
        await fetchPositions();
        checkedRowKeys.value = checkedRowKeys.value.filter((k) => k !== row.id);
      } catch (error) {
        // Error already handled by interceptor
      }
    },
  });
}

function handleBatchDelete() {
  const keys = checkedRowKeys.value;
  if (keys.length === 0) {
    message.warning('请选择要删除的岗位');
    return;
  }
  dialog.warning({
    title: '确认删除',
    content: `确定删除选中的 ${keys.length} 个岗位吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        // Delete each position one by one
        for (const id of keys) {
          await deletePositionApi(id);
        }
        message.success('删除成功');
        await fetchPositions();
        checkedRowKeys.value = [];
      } catch (error) {
        // Error already handled by interceptor
      }
    },
  });
}

function handleRefresh() {
  fetchPositions();
}

function handleSearch() {
  page.value = 1;
  fetchPositions();
}

function handleReset() {
  keyword.value = '';
  page.value = 1;
  fetchPositions();
}

const columns = computed((): DataTableColumns<PositionApi.Position> => {
  return [
    {
      type: 'selection',
    },
    {
      title: 'ID',
      key: 'id',
      width: 80,
    },
    {
      title: '岗位编码',
      key: 'code',
      width: 180,
    },
    {
      title: '岗位名称',
      key: 'name',
      minWidth: 160,
    },
    {
      title: '岗位描述',
      key: 'description',
      minWidth: 200,
      ellipsis: {
        tooltip: true,
      },
    },
    {
      title: '排序',
      key: 'sort',
      width: 100,
    },
    {
      title: '状态',
      key: 'enable',
      width: 90,
      render: (row) => {
        return h(
          NTag,
          { type: row.enable ? 'success' : 'default', size: 'small' },
          {
            default: () => (row.enable ? '启用' : '停用'),
          },
        );
      },
    },
    {
      title: '创建时间',
      key: 'createTime',
      width: 180,
      render: (row) => new Date(row.createTime).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (row) => {
        return h(
          NSpace,
          { size: 8 },
          {
            default: () => [
              h(
                NButton,
                {
                  size: 'tiny',
                  tertiary: true,
                  type: 'primary',
                  onClick: () => openEdit(row),
                },
                { default: () => '编辑' },
              ),
              h(
                NButton,
                {
                  size: 'tiny',
                  tertiary: true,
                  type: 'error',
                  onClick: () => handleDelete(row),
                },
                { default: () => '删除' },
              ),
            ],
          },
        );
      },
    },
  ];
});
</script>

<template>
  <div class="p-4">
    <NCard title="岗位管理" :bordered="false" size="small">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <NSpace :wrap="true" :size="12" align="center">
          <NInput
            v-model:value="keyword"
            clearable
            placeholder="搜索岗位名称"
            class="w-[260px]"
            @keyup.enter="handleSearch"
          />
          <NButton type="primary" @click="handleSearch">查询</NButton>
          <NButton @click="handleReset">重置</NButton>
          <NButton tertiary @click="handleRefresh">刷新</NButton>
        </NSpace>

        <NSpace :wrap="true" :size="12" align="center">
          <NButton
            :disabled="checkedRowKeys.length === 0"
            tertiary
            type="error"
            @click="handleBatchDelete"
          >
            删除选中
          </NButton>
          <NButton type="primary" @click="openCreate">新增岗位</NButton>
        </NSpace>
      </div>

      <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="dataSource"
        :pagination="false"
        :row-key="(row) => row.id"
        v-model:checked-row-keys="checkedRowKeys"
        :scroll-x="1200"
        striped
      />

      <div class="mt-3 flex justify-end">
        <NPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page="fetchPositions"
          @update:page-size="fetchPositions"
        />
      </div>
    </NCard>

    <PositionModal
      v-model:show="modalOpen"
      :mode="modalMode"
      :initial-values="modalInitialValues"
      :existing-codes="existingCodes"
      :original-code="originalCode"
      @submit="handlePositionSubmit"
    />
  </div>
</template>
