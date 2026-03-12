<script lang="ts" setup>
import type { DataTableColumns, TreeSelectOption } from 'naive-ui';

import { computed, h, onMounted, ref } from 'vue';

import { NButton, NCard, NDataTable, NInput, NSpace, NTag } from 'naive-ui';

import { dialog, message } from '#/adapter/naive';

import {
  createDepartmentApi,
  deleteDepartmentApi,
  getDepartmentTreeApi,
  updateDepartmentApi,
  type DepartmentApi,
} from '#/api';

import DepartmentModal from './departmentModal.vue';

defineOptions({ name: 'OrganizationOrgPage' });

type DepartmentRecord = DepartmentApi.Department;

const keyword = ref('');
const loading = ref(false);

const departments = ref<DepartmentRecord[]>([]);

// Fetch departments from backend
async function fetchDepartments() {
  loading.value = true;
  try {
    const result = await getDepartmentTreeApi();
    departments.value = result;
  } catch (error) {
    console.error('Failed to fetch departments:', error);
  } finally {
    loading.value = false;
  }
}

// Load departments on mount
onMounted(() => {
  fetchDepartments();
});

// Flatten tree to get all departments
function flattenTree(tree: DepartmentRecord[]): DepartmentRecord[] {
  const result: DepartmentRecord[] = [];
  const walk = (nodes: DepartmentRecord[]) => {
    nodes.forEach((node) => {
      result.push(node);
      if (node.children?.length) {
        walk(node.children);
      }
    });
  };
  walk(tree);
  return result;
}

const allDepartments = computed(() => flattenTree(departments.value));

const existingCodes = computed(() => allDepartments.value.map((d) => d.code));

// Filter tree by keyword
function filterTree(tree: DepartmentRecord[], keyword: string): DepartmentRecord[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return tree;

  const walk = (nodes: DepartmentRecord[]): DepartmentRecord[] => {
    const result: DepartmentRecord[] = [];
    nodes.forEach((node) => {
      const matched = node.name.toLowerCase().includes(kw) || node.code.toLowerCase().includes(kw);
      const children = node.children?.length ? walk(node.children) : [];

      if (matched || children.length) {
        result.push({
          ...node,
          children: children.length ? children : undefined,
        });
      }
    });
    return result;
  };

  return walk(tree);
}

const filteredDepartments = computed(() => filterTree(departments.value, keyword.value));

// Convert tree to tree select options
function convertToTreeSelectOptions(
  tree: DepartmentRecord[],
  excludeId?: number,
): TreeSelectOption[] {
  return tree
    .filter((node) => node.id !== excludeId)
    .map((node) => ({
      label: node.name,
      value: node.id,
      children:
        node.children?.length ? convertToTreeSelectOptions(node.children, excludeId) : undefined,
    }));
}

const parentOptions = computed(() => {
  return convertToTreeSelectOptions(departments.value, editingId.value || undefined);
});

const checkedRowKeys = ref<number[]>([]);
const expandedRowKeys = ref<number[]>([]);

// Modal state
const modalOpen = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const modalInitialValues = ref<Partial<DepartmentRecord>>({});
const originalCode = ref<string | undefined>(undefined);
const editingId = ref<number | null>(null);

function openCreate() {
  modalMode.value = 'create';
  editingId.value = null;
  originalCode.value = undefined;
  modalInitialValues.value = {
    code: '',
    name: '',
    description: '',
    parentId: null,
    order: 0,
    enable: true,
  };
  modalOpen.value = true;
}

function openEdit(row: DepartmentRecord) {
  modalMode.value = 'edit';
  editingId.value = row.id;
  originalCode.value = row.code;
  modalInitialValues.value = {
    code: row.code,
    name: row.name,
    description: row.description,
    parentId: row.parentId,
    order: row.order,
    enable: row.enable,
  };
  modalOpen.value = true;
}

async function handleSubmit(values: any) {
  try {
    if (modalMode.value === 'create') {
      await createDepartmentApi(values);
      message.success('新增成功');
    } else {
      const id = editingId.value;
      if (!id) return;
      await updateDepartmentApi(id, values);
      message.success('保存成功');
    }

    modalOpen.value = false;
    await fetchDepartments();
  } catch (error) {
    // Error already handled by interceptor
  }
}

function handleDelete(row: DepartmentRecord) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除部门「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteDepartmentApi(row.id);
        message.success('删除成功');
        await fetchDepartments();
        checkedRowKeys.value = checkedRowKeys.value.filter((k) => k !== row.id);
      } catch (error) {
        // Error already handled by interceptor
      }
    },
  });
}

function handleRefresh() {
  fetchDepartments();
}

function expandAll() {
  expandedRowKeys.value = allDepartments.value.map((d) => d.id);
}

function collapseAll() {
  expandedRowKeys.value = [];
}

const columns = computed((): DataTableColumns<DepartmentRecord> => {
  return [
    {
      type: 'selection',
      fixed: 'left',
      width: 48,
    },
    {
      title: '部门名称',
      key: 'name',
      fixed: 'left',
      minWidth: 200,
      tree: true,
      render: (row) => row.name,
    },
    {
      title: '部门编码',
      key: 'code',
      minWidth: 150,
    },
    {
      title: '描述',
      key: 'description',
      minWidth: 200,
      ellipsis: { tooltip: true },
      render: (row) => row.description || '-',
    },
    {
      title: '排序',
      key: 'order',
      width: 80,
    },
    {
      title: '状态',
      key: 'enable',
      width: 90,
      render: (row) =>
        h(
          NTag,
          { size: 'small', bordered: false, type: row.enable ? 'success' : 'default' },
          { default: () => (row.enable ? '启用' : '停用') },
        ),
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
      render: (row) =>
        h(
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
        ),
    },
  ];
});
</script>

<template>
  <div class="p-4">
    <NCard title="部门管理" :bordered="false" size="small">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <NSpace :wrap="true" :size="12" align="center">
          <NInput
            v-model:value="keyword"
            clearable
            placeholder="搜索部门名称或编码"
            class="w-[260px]"
          />
          <NButton tertiary @click="handleRefresh">刷新</NButton>
        </NSpace>

        <NSpace :wrap="true" :size="12" align="center">
          <NButton tertiary @click="expandAll">展开全部</NButton>
          <NButton tertiary @click="collapseAll">折叠全部</NButton>
          <NButton type="primary" @click="openCreate">新增部门</NButton>
        </NSpace>
      </div>

      <NDataTable
        :loading="loading"
        :columns="columns"
        :data="filteredDepartments"
        :row-key="(row) => row.id"
        v-model:checked-row-keys="checkedRowKeys"
        v-model:expanded-row-keys="expandedRowKeys"
        :scroll-x="1100"
        striped
      />
    </NCard>

    <DepartmentModal
      v-model:show="modalOpen"
      :mode="modalMode"
      :initial-values="modalInitialValues"
      :parent-options="parentOptions"
      :existing-codes="existingCodes"
      :original-code="originalCode"
      @submit="handleSubmit"
    />
  </div>
</template>
