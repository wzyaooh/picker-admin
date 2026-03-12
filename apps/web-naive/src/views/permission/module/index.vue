<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui';

import { computed, h, onMounted, ref, watch } from 'vue';

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
  createPermissionApi,
  deletePermissionApi,
  getAllPermissionsApi,
  updatePermissionApi,
} from '#/api';

import ApplyModal from './applyModal.vue';

defineOptions({ name: 'PermissionModulePage' });

type ModuleRecord = {
  code: string;
  createdAt: string;
  description?: string;
  enable: boolean;  // 使用后端字段名
  id: number;
  name: string;
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const keyword = ref('');
const loading = ref(false);

const dataSource = ref<ModuleRecord[]>([]);

// Fetch modules from backend
async function fetchModules() {
  loading.value = true;
  try {
    const result = await getAllPermissionsApi();
    console.log('API Response:', result); // Debug log
    
    // Filter only MODULE type permissions
    const modules = result.filter(item => item.type === 'MODULE');
    console.log('Filtered modules:', modules); // Debug log
    
    dataSource.value = modules.map(item => ({
      id: item.id,
      name: item.name,
      code: item.code,
      enable: item.enable ?? true,  // 使用后端字段名
      description: item.description ?? '',
      createdAt: item.createdAt ?? new Date().toISOString(),
    }));
    
    if (dataSource.value.length === 0) {
      console.warn('No MODULE type permissions found. Please run the initialization script.');
    }
  } catch (error) {
    console.error('Failed to fetch modules:', error);
    message.error('加载模块列表失败');
  } finally {
    loading.value = false;
  }
}

// Load modules on mount
onMounted(() => {
  fetchModules();
});

const filteredData = computed(() => {
  const k = keyword.value.trim().toLowerCase();
  if (!k) {
    return dataSource.value;
  }

  return dataSource.value.filter((item) => {
    return (
      item.name.toLowerCase().includes(k) || item.code.toLowerCase().includes(k)
    );
  });
});

const page = ref(1);
const pageSize = ref(10);
const total = computed(() => filteredData.value.length);

watch(
  () => keyword.value,
  () => {
    page.value = 1;
  },
);

const pagedData = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredData.value.slice(start, end);
});

const checkedRowKeys = ref<Array<number>>([]);

const modalOpen = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const editingId = ref<number | null>(null);
const modalInitialValues = ref<{
  code?: string;
  description?: string;
  enable?: boolean;  // 使用后端字段名
  name?: string;
}>({});
const originalCode = ref<string | undefined>(undefined);

const existingCodes = computed(() => dataSource.value.map((item) => item.code));

function openCreate() {
  modalMode.value = 'create';
  editingId.value = null;
  modalInitialValues.value = {
    code: '',
    description: '',
    enable: true,  // 使用后端字段名
    name: '',
  };
  originalCode.value = undefined;
  modalOpen.value = true;
}

function openEdit(row: ModuleRecord) {
  modalMode.value = 'edit';
  editingId.value = row.id;
  modalInitialValues.value = {
    code: row.code,
    description: row.description ?? '',
    enable: row.enable,  // 使用后端字段名
    name: row.name,
  };
  originalCode.value = row.code;
  modalOpen.value = true;
}

function handleDelete(row: ModuleRecord) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除模块「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deletePermissionApi(row.id);
        message.success('删除成功');
        await fetchModules();
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
    return;
  }
  dialog.warning({
    title: '确认删除',
    content: `确定删除选中的 ${keys.length} 个模块吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        // Delete each module one by one
        for (const id of keys) {
          await deletePermissionApi(id);
        }
        message.success('删除成功');
        await fetchModules();
        checkedRowKeys.value = [];
      } catch (error) {
        // Error already handled by interceptor
      }
    },
  });
}

async function handleModalSubmit(values: {
  code: string;
  description: string;
  enable: boolean;  // 使用后端字段名
  name: string;
}) {
  try {
    if (modalMode.value === 'create') {
      await createPermissionApi({
        name: values.name,
        code: values.code,
        type: 'MODULE',
        enable: values.enable,  // 使用后端字段名
        description: values.description,
        order: 0,  // 使用后端字段名
      });
      message.success('新增成功');
    } else {
      const id = editingId.value;
      if (!id) return;
      await updatePermissionApi(id, {
        name: values.name,
        code: values.code,
        enable: values.enable,  // 使用后端字段名
        description: values.description,
      });
      message.success('保存成功');
    }

    modalOpen.value = false;
    await fetchModules();
  } catch (error) {
    // Error already handled by interceptor
  }
}

function handleRefresh() {
  fetchModules();
}

const columns = computed((): DataTableColumns<ModuleRecord> => {
  return [
    {
      type: 'selection',
    },
    {
      title: '模块名称',
      key: 'name',
      minWidth: 160,
    },
    {
      title: '模块编码',
      key: 'code',
      minWidth: 160,
    },
    {
      title: '状态',
      key: 'enable',  // 使用后端字段名
      width: 90,
      render: (row) => {
        return h(
          NTag,
          { type: row.enable ? 'success' : 'default', size: 'small' },  // 使用后端字段名
          {
            default: () => (row.enable ? '启用' : '停用'),  // 使用后端字段名
          },
        );
      },
    },
    {
      title: '描述',
      key: 'description',
      minWidth: 220,
      ellipsis: {
        tooltip: true,
      },
    },
    {
      title: '创建时间',
      key: 'createdAt',
      width: 180,
      render: (row) => formatTime(row.createdAt),
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
    <NCard title="模块管理" :bordered="false" size="small">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <NSpace :wrap="true" :size="12" align="center">
          <NInput
            v-model:value="keyword"
            clearable
            placeholder="搜索模块名称/编码"
            class="w-[260px]"
          />
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
          <NButton type="primary" @click="openCreate">新增模块</NButton>
        </NSpace>
      </div>

      <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="pagedData"
        :pagination="false"
        :row-key="(row) => row.id"
        v-model:checked-row-keys="checkedRowKeys"
        :scroll-x="1100"
        striped
      />

      <div class="mt-3 flex justify-end">
        <NPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          show-size-picker
        />
      </div>
    </NCard>

    <ApplyModal
      v-model:show="modalOpen"
      :mode="modalMode"
      :initial-values="modalInitialValues"
      :existing-codes="existingCodes"
      :original-code="originalCode"
      @submit="handleModalSubmit"
    />
  </div>
</template>
