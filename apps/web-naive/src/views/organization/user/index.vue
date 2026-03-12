<script lang="ts" setup>
/**
 * 用户管理页面
 *
 * 提供用户的增删改查功能，包括：
 * - 用户列表展示（支持分页、搜索）
 * - 新增用户
 * - 编辑用户
 * - 删除用户（单个/批量）
 * - 用户角色分配
 * - 用户部门/岗位分配
 */

import { onMounted, ref } from 'vue';
import { NCard, NPagination } from 'naive-ui';
import { dialog, message } from '#/adapter/naive';
import {
  createUserApi,
  deleteUserApi,
  getUserListApi,
  resetPasswordApi,
  updateUserApi,
  type UserApi,
} from '#/api';

import { UserFilter, UserModal, UserTable } from './components';

defineOptions({ name: 'OrganizationUserPage' });

/**
 * 用户记录类型
 */
type UserRecord = UserApi.User & {
  profile?: UserApi.UserProfile;
};

// ==================== 状态管理 ====================

/** 搜索关键词 */
const keyword = ref('');

/** 加载状态 */
const loading = ref(false);

/** 用户数据列表 */
const dataSource = ref<UserRecord[]>([]);

/** 当前页码 */
const page = ref(1);

/** 每页数量 */
const pageSize = ref(10);

/** 总记录数 */
const total = ref(0);

/** 选中的行键列表 */
const checkedRowKeys = ref<number[]>([]);

// ==================== 数据获取 ====================

/**
 * 获取用户列表
 *
 * 从后端获取用户数据，支持分页和搜索。
 */
async function fetchUsers() {
  loading.value = true;
  try {
    const result = await getUserListApi({
      pageNo: page.value,
      pageSize: pageSize.value,
      username: keyword.value || undefined,
    });
    dataSource.value = result.pageData;
    total.value = result.total;
  } catch (error) {
    console.error('Failed to fetch users:', error);
  } finally {
    loading.value = false;
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchUsers();
});

// ==================== 弹窗管理 ====================

/** 弹窗显示状态 */
const modalOpen = ref(false);

/** 弹窗模式：创建或编辑 */
const modalMode = ref<'create' | 'edit'>('create');

/** 弹窗初始值 */
const modalInitialValues = ref<{
  username?: string;
  enabled?: boolean;
  departmentId?: number | null;
  positionId?: number | null;
  roleIds?: number[];
}>({});

/** 原始用户名（编辑时使用） */
const originalUsername = ref<string | undefined>(undefined);

/** 正在编辑的用户ID */
const editingId = ref<number | null>(null);

/** 已存在的用户名列表（用于验证） */
const existingUsernames = ref<string[]>([]);

// 更新已存在的用户名列表
function updateExistingUsernames() {
  existingUsernames.value = dataSource.value?.map((u) => u.username) || [];
}

// ==================== 操作处理 ====================

/**
 * 打开创建用户弹窗
 */
function openCreate() {
  modalMode.value = 'create';
  editingId.value = null;
  originalUsername.value = undefined;
  modalInitialValues.value = {
    username: '',
    enabled: true,
    departmentId: null,
    positionId: null,
    roleIds: [],
  };
  updateExistingUsernames();
  modalOpen.value = true;
}

/**
 * 打开编辑用户弹窗
 *
 * @param row 要编辑的用户数据
 */
function openEdit(row: UserRecord) {
  modalMode.value = 'edit';
  editingId.value = row.id;
  originalUsername.value = row.username;
  modalInitialValues.value = {
    username: row.username,
    enabled: row.enabled,
    departmentId: row.departmentId ?? null,
    positionId: row.positionId ?? null,
    roleIds: row.roles?.map(r => r.id) ?? [],
  };
  updateExistingUsernames();
  modalOpen.value = true;
}

/**
 * 处理用户提交（创建或更新）
 *
 * @param values 表单数据
 */
async function handleUserSubmit(values: {
  username: string;
  enabled: boolean;
  departmentId: number | null;
  positionId: number | null;
  roleIds: number[];
}) {
  try {
    if (modalMode.value === 'create') {
      await createUserApi({
        username: values.username,
        enabled: values.enabled,
        departmentId: values.departmentId ?? undefined,
        positionId: values.positionId ?? undefined,
        roleIds: values.roleIds,
      });
      message.success('新增成功，默认密码为 123456');
    } else {
      const id = editingId.value;
      if (!id) return;
      
      await updateUserApi(id, {
        enabled: values.enabled,
        departmentId: values.departmentId ?? undefined,
        positionId: values.positionId ?? undefined,
        roleIds: values.roleIds,
      });
      message.success('保存成功');
    }
    
    modalOpen.value = false;
    await fetchUsers();
  } catch (error) {
    // 错误已被拦截器处理
  }
}

/**
 * 处理重置密码
 *
 * @param row 要重置密码的用户数据
 */
function handleResetPassword(row: UserRecord) {
  dialog.warning({
    title: '确认重置密码',
    content: `确定将用户「${row.username}」的密码重置为默认密码（123456）吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await resetPasswordApi(row.id);
        message.success('密码已重置为 123456');
      } catch (error) {
        // 错误已被拦截器处理
      }
    },
  });
}

/**
 * 处理删除用户
 *
 * @param row 要删除的用户数据
 */
function handleDelete(row: UserRecord) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除用户「${row.username}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteUserApi(row.id);
        message.success('删除成功');
        await fetchUsers();
        checkedRowKeys.value = checkedRowKeys.value.filter((k) => k !== row.id);
      } catch (error) {
        // 错误已被拦截器处理
      }
    },
  });
}

/**
 * 处理批量删除用户
 */
function handleBatchDelete() {
  const keys = checkedRowKeys.value;
  if (keys.length === 0) {
    message.warning('请选择要删除的用户');
    return;
  }
  dialog.warning({
    title: '确认删除',
    content: `确定删除选中的 ${keys.length} 个用户吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        // 逐个删除用户
        for (const id of keys) {
          await deleteUserApi(id);
        }
        message.success('删除成功');
        await fetchUsers();
        checkedRowKeys.value = [];
      } catch (error) {
        // 错误已被拦截器处理
      }
    },
  });
}

/**
 * 处理刷新
 */
function handleRefresh() {
  fetchUsers();
}

/**
 * 处理搜索
 */
function handleSearch() {
  page.value = 1;
  fetchUsers();
}

/**
 * 处理重置
 */
function handleReset() {
  keyword.value = '';
  page.value = 1;
  fetchUsers();
}
</script>

<template>
  <div class="p-4">
    <NCard title="用户管理" :bordered="false" size="small">
      <!-- 筛选组件 -->
      <UserFilter
        v-model:keyword="keyword"
        :loading="loading"
        :checked-count="checkedRowKeys.length"
        @search="handleSearch"
        @reset="handleReset"
        @refresh="handleRefresh"
        @create="openCreate"
        @batch-delete="handleBatchDelete"
      />

      <!-- 表格组件 -->
      <UserTable
        :data="dataSource"
        :loading="loading"
        v-model:checked-row-keys="checkedRowKeys"
        @edit="openEdit"
        @delete="handleDelete"
        @reset-password="handleResetPassword"
      />

      <!-- 分页 -->
      <div class="mt-3 flex justify-end">
        <NPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page="fetchUsers"
          @update:page-size="fetchUsers"
        />
      </div>
    </NCard>

    <!-- 用户弹窗 -->
    <UserModal
      v-model:show="modalOpen"
      :mode="modalMode"
      :initial-values="modalInitialValues"
      :existing-usernames="existingUsernames"
      :original-username="originalUsername"
      @submit="handleUserSubmit"
    />
  </div>
</template>
