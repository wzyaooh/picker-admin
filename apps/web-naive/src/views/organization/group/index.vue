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
  createUserGroupApi,
  deleteUserGroupApi,
  getUserGroupListApi,
  updateUserGroupApi,
  getUserGroupPermissionsApi,
  setUserGroupPermissionsApi,
  type UserGroupApi,
} from '#/api';

import UserGroupModal from './userGroupModal.vue';
import MemberModal from './memberModal.vue';
import PermissionConfig from '#/components/PermissionConfig.vue';

defineOptions({ name: 'OrganizationGroupPage' });

const keyword = ref('');
const loading = ref(false);

const dataSource = ref<UserGroupApi.UserGroup[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

// Fetch user groups from backend
async function fetchUserGroups() {
  loading.value = true;
  try {
    const result = await getUserGroupListApi({
      pageNo: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    });
    dataSource.value = result.pageData;
    total.value = result.total;
  } catch (error) {
    console.error('Failed to fetch user groups:', error);
  } finally {
    loading.value = false;
  }
}

// Load user groups on mount
onMounted(() => {
  fetchUserGroups();
});

const checkedRowKeys = ref<number[]>([]);

// Modal state
const modalOpen = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const modalInitialValues = ref<{
  code?: string;
  name?: string;
  description?: string;
  enable?: boolean;
  sort?: number;
}>({});
const originalCode = ref<string | undefined>(undefined);
const editingId = ref<number | null>(null);

// Member modal state
const memberModalOpen = ref(false);
const memberModalGroupId = ref<number | null>(null);
const memberModalGroupName = ref<string>('');

// Permission modal state
const permissionModalOpen = ref(false);
const permissionModalGroupId = ref<number | null>(null);
const permissionModalGroupName = ref<string>('');
const permissionModalSelectedIds = ref<number[]>([]);

const existingCodes = computed(
  () => dataSource.value?.map((g) => g.code) || [],
);

function openCreate() {
  modalMode.value = 'create';
  editingId.value = null;
  originalCode.value = undefined;
  modalInitialValues.value = {
    code: '',
    name: '',
    description: '',
    enable: true,
    sort: 0,
  };
  modalOpen.value = true;
}

function openEdit(row: UserGroupApi.UserGroup) {
  modalMode.value = 'edit';
  editingId.value = row.id;
  originalCode.value = row.code;
  modalInitialValues.value = {
    code: row.code,
    name: row.name,
    description: row.description,
    enable: row.enable,
    sort: row.sort,
  };
  modalOpen.value = true;
}

function openMemberModal(row: UserGroupApi.UserGroup) {
  memberModalGroupId.value = row.id;
  memberModalGroupName.value = row.name;
  memberModalOpen.value = true;
}

async function openPermissionModal(row: UserGroupApi.UserGroup) {
  try {
    const permissions = await getUserGroupPermissionsApi(row.id);
    permissionModalGroupId.value = row.id;
    permissionModalGroupName.value = row.name;
    permissionModalSelectedIds.value = permissions.map((p: any) => p.id);
    permissionModalOpen.value = true;
  } catch (error) {
    console.error('Failed to fetch group permissions:', error);
  }
}

async function handlePermissionSubmit(permissionIds: number[]) {
  if (!permissionModalGroupId.value) return;

  try {
    await setUserGroupPermissionsApi(
      permissionModalGroupId.value,
      permissionIds,
    );
    message.success('权限配置成功');
    await fetchUserGroups();
  } catch (error) {
    // Error already handled by interceptor
  }
}

async function handleUserGroupSubmit(values: {
  code: string;
  name: string;
  description: string;
  enable: boolean;
  sort: number;
}) {
  try {
    if (modalMode.value === 'create') {
      await createUserGroupApi(values);
      message.success('新增成功');
    } else {
      const id = editingId.value;
      if (!id) return;

      await updateUserGroupApi(id, values);
      message.success('保存成功');
    }

    modalOpen.value = false;
    await fetchUserGroups();
  } catch (error) {
    // Error already handled by interceptor
  }
}

function handleDelete(row: UserGroupApi.UserGroup) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除用户组「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteUserGroupApi(row.id);
        message.success('删除成功');
        await fetchUserGroups();
        checkedRowKeys.value = checkedRowKeys.value.filter(
          (k) => k !== row.id,
        );
      } catch (error) {
        // Error already handled by interceptor
      }
    },
  });
}

function handleBatchDelete() {
  const keys = checkedRowKeys.value;
  if (keys.length === 0) {
    message.warning('请选择要删除的用户组');
    return;
  }
  dialog.warning({
    title: '确认删除',
    content: `确定删除选中的 ${keys.length} 个用户组吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        // Delete each user group one by one
        for (const id of keys) {
          await deleteUserGroupApi(id);
        }
        message.success('删除成功');
        await fetchUserGroups();
        checkedRowKeys.value = [];
      } catch (error) {
        // Error already handled by interceptor
      }
    },
  });
}

function handleRefresh() {
  fetchUserGroups();
}

function handleSearch() {
  page.value = 1;
  fetchUserGroups();
}

function handleReset() {
  keyword.value = '';
  page.value = 1;
  fetchUserGroups();
}

const columns = computed((): DataTableColumns<UserGroupApi.UserGroup> => {
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
      title: '编码',
      key: 'code',
      minWidth: 140,
    },
    {
      title: '名称',
      key: 'name',
      minWidth: 140,
    },
    {
      title: '描述',
      key: 'description',
      minWidth: 200,
      ellipsis: {
        tooltip: true,
      },
    },
    {
      title: '成员数',
      key: 'members',
      width: 100,
      render: (row) => {
        const count = row.members?.length || 0;
        return h('span', {}, count);
      },
    },
    {
      title: '排序',
      key: 'sort',
      width: 80,
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
      width: 260,
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
                  type: 'info',
                  onClick: () => openMemberModal(row),
                },
                { default: () => '成员' },
              ),
              h(
                NButton,
                {
                  size: 'tiny',
                  tertiary: true,
                  type: 'warning',
                  onClick: () => openPermissionModal(row),
                },
                { default: () => '权限' },
              ),
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
    <NCard title="用户组管理" :bordered="false" size="small">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <NSpace :wrap="true" :size="12" align="center">
          <NInput
            v-model:value="keyword"
            clearable
            placeholder="搜索编码或名称"
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
          <NButton type="primary" @click="openCreate">新增用户组</NButton>
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
        :scroll-x="1300"
        striped
      />

      <div class="mt-3 flex justify-end">
        <NPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page="fetchUserGroups"
          @update:page-size="fetchUserGroups"
        />
      </div>
    </NCard>

    <UserGroupModal
      v-model:show="modalOpen"
      :mode="modalMode"
      :initial-values="modalInitialValues"
      :existing-codes="existingCodes"
      :original-code="originalCode"
      @submit="handleUserGroupSubmit"
    />

    <MemberModal
      v-model:show="memberModalOpen"
      :group-id="memberModalGroupId"
      :group-name="memberModalGroupName"
      @updated="fetchUserGroups"
    />

    <PermissionConfig
      v-model:show="permissionModalOpen"
      :title="`配置权限 - ${permissionModalGroupName}`"
      :selected-permission-ids="permissionModalSelectedIds"
      @submit="handlePermissionSubmit"
    />
  </div>
</template>
