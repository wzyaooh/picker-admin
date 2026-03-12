<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui';
import { computed, h, ref, watch } from 'vue';
import { NButton, NDataTable, NInput, NTag } from 'naive-ui';
import { getUserListApi } from '#/api/core/user';
import { getRoleUsersPageApi } from '#/api/modules/role';
import { message } from '#/adapter/naive';

export interface User {
  id: number;
  username: string;
  realName?: string;
  email?: string;
  enabled: boolean;
}

interface Props {
  roleId: number | null;
  roleName: string;
  selectedUserIds: number[];
  hasChanges: boolean;
  minHeight?: number;
}

interface Emits {
  (e: 'save'): void;
  (e: 'addUser', userId: number): void;
  (e: 'removeUser', userId: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  minHeight: 360,
});

const emit = defineEmits<Emits>();

// ==================== 左侧：所有用户列表 ====================
const allUsers = ref<User[]>([]);
const allUsersLoading = ref(false);
const allUsersKeywordDraft = ref('');
const allUsersKeyword = ref('');
const allUsersPage = ref(1);
const allUsersPageSize = ref(10);
const allUsersTotal = ref(0);

// 加载所有用户列表（支持分页和搜索）
async function fetchAllUsers() {
  allUsersLoading.value = true;
  try {
    const result = await getUserListApi({
      pageNo: allUsersPage.value,
      pageSize: allUsersPageSize.value,
      username: allUsersKeyword.value || undefined,
    });
    
    const items = result.pageData || [];
    allUsers.value = items.map(item => ({
      id: item.id,
      username: item.username,
      realName: (item as any).realName,
      email: (item as any).email,
      enabled: item.enabled ?? true,
    }));
    
    allUsersTotal.value = result.total || 0;
  } catch {
    message.error('加载用户列表失败');
  } finally {
    allUsersLoading.value = false;
  }
}

// 监听分页变化
watch([allUsersPage, allUsersPageSize], () => {
  fetchAllUsers();
});

// 初始加载
watch(() => props.roleId, (newRoleId) => {
  if (newRoleId) {
    fetchAllUsers();
  }
}, { immediate: true });

function queryAllUsers() {
  allUsersKeyword.value = allUsersKeywordDraft.value;
  allUsersPage.value = 1;
  fetchAllUsers();
}

function resetAllUsersQuery() {
  allUsersKeywordDraft.value = '';
  allUsersKeyword.value = '';
  allUsersPage.value = 1;
  fetchAllUsers();
}

const allUsersPagination = computed(() => ({
  page: allUsersPage.value,
  pageSize: allUsersPageSize.value,
  itemCount: allUsersTotal.value,
  pageSizes: [10, 20, 50],
  showSizePicker: true,
  onUpdatePage: (p: number) => {
    allUsersPage.value = p;
  },
  onUpdatePageSize: (ps: number) => {
    allUsersPageSize.value = ps;
    allUsersPage.value = 1;
  },
}));

// ==================== 右侧：已授权用户列表 ====================
const authedUsers = ref<User[]>([]);
const authedUsersLoading = ref(false);
const authedUsersPage = ref(1);
const authedUsersPageSize = ref(10);
const authedUsersTotal = ref(0);

const selectedUserSet = computed(() => new Set(props.selectedUserIds));

// 加载已授权用户列表（支持分页）
async function fetchAuthedUsers() {
  if (!props.roleId) return;
  
  authedUsersLoading.value = true;
  try {
    const result = await getRoleUsersPageApi({
      roleId: props.roleId,
      pageNo: authedUsersPage.value,
      pageSize: authedUsersPageSize.value,
    });
    
    const items = result.pageData || [];
    authedUsers.value = items.map(item => ({
      id: item.id,
      username: item.username,
      realName: item.realName,
      email: item.email,
      enabled: item.enabled ?? true,
    }));
    
    authedUsersTotal.value = result.total;
  } catch {
    message.error('加载已授权用户失败');
  } finally {
    authedUsersLoading.value = false;
  }
}

// 监听分页变化
watch([authedUsersPage, authedUsersPageSize], () => {
  fetchAuthedUsers();
});

// 监听角色变化
watch(() => props.roleId, (newRoleId) => {
  if (newRoleId) {
    authedUsersPage.value = 1;
    fetchAuthedUsers();
  }
}, { immediate: true });

// 监听选中用户变化（添加/移除用户后刷新）
watch(() => props.selectedUserIds, () => {
  fetchAuthedUsers();
}, { deep: true });

const authedUsersPagination = computed(() => ({
  page: authedUsersPage.value,
  pageSize: authedUsersPageSize.value,
  itemCount: authedUsersTotal.value,
  pageSizes: [10, 20, 50],
  showSizePicker: true,
  onUpdatePage: (p: number) => {
    authedUsersPage.value = p;
  },
  onUpdatePageSize: (ps: number) => {
    authedUsersPageSize.value = ps;
    authedUsersPage.value = 1;
  },
}));

// ==================== 渲染函数 ====================
// 创建头像渲染器
function renderAvatar(row: User) {
  const text = (row.realName || row.username).slice(0, 1).toUpperCase();
  return h(
    'div',
    {
      class: 'flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary',
    },
    text,
  );
}

// 通用列定义
const commonColumns: DataTableColumns<User> = [
  {
    title: '',
    key: 'avatar',
    width: 56,
    align: 'center',
    render: renderAvatar,
  },
  {
    title: '用户名',
    key: 'username',
    width: 140,
    ellipsis: { tooltip: true },
    render: (row) => row.username,
  },
  {
    title: '姓名',
    key: 'realName',
    minWidth: 120,
    ellipsis: { tooltip: true },
    render: (row) => row.realName || '-',
  },
];

const allUsersColumns = computed((): DataTableColumns<User> => {
  return [
    {
      title: '',
      key: 'action',
      width: 60,
      align: 'center',
      fixed: 'left',
      render: (row) => {
        const disabled = !props.roleId || selectedUserSet.value.has(row.id) || !row.enabled;
        return h(
          NButton,
          {
            size: 'small',
            dashed: true,
            disabled,
            onClick: () => emit('addUser', row.id),
          },
          { default: () => '+' },
        );
      },
    },
    ...commonColumns,
    {
      title: '邮箱',
      key: 'email',
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row) => row.email || '-',
    },
    {
      title: '状态',
      key: 'enabled',
      width: 80,
      align: 'center',
      render: (row) => {
        return h(
          NTag,
          {
            size: 'small',
            type: row.enabled ? 'success' : 'error',
            bordered: false,
          },
          { default: () => (row.enabled ? '启用' : '禁用') },
        );
      },
    },
  ];
});

const authedUsersColumns = computed((): DataTableColumns<User> => {
  return [
    {
      title: '',
      key: 'action',
      width: 60,
      align: 'center',
      fixed: 'left',
      render: (row) => {
        const disabled = !props.roleId;
        return h(
          NButton,
          {
            size: 'small',
            dashed: true,
            type: 'error',
            disabled,
            onClick: () => emit('removeUser', row.id),
          },
          { default: () => '-' },
        );
      },
    },
    ...commonColumns,
  ];
});
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="mb-3 flex items-center justify-between">
      <div class="text-muted-foreground text-sm">
        为当前角色分配用户
      </div>
      <NButton 
        type="primary" 
        :disabled="!hasChanges"
        @click="emit('save')"
      >
        保存
      </NButton>
    </div>

    <div
      class="flex-1 min-h-0 grid grid-cols-2 gap-4"
      :style="{ minHeight: `${minHeight}px` }"
    >
      <div class="flex h-full min-h-0 flex-col rounded-md border border-border">
        <div class="p-3 border-b border-border">
          <div class="flex items-center gap-3">
            <NInput
              v-model:value="allUsersKeywordDraft"
              clearable
              placeholder="请输入用户名"
              class="flex-1"
              @keyup.enter="queryAllUsers"
            />
            <NButton type="primary" @click="queryAllUsers">查询</NButton>
            <NButton @click="resetAllUsersQuery">重置</NButton>
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-hidden">
          <NDataTable
            class="role-users-all-table"
            :columns="allUsersColumns"
            :data="allUsers"
            :pagination="allUsersPagination"
            :loading="allUsersLoading"
            :bordered="false"
            :scroll-x="800"
            flex-height
          />
        </div>
      </div>

      <div class="flex h-full min-h-0 flex-col rounded-md border border-border">
        <div class="p-3 border-b border-border">
          <div class="text-sm font-medium">已授权用户</div>
        </div>

        <div class="flex-1 min-h-0 overflow-hidden">
          <NDataTable
            class="role-users-authed-table"
            :columns="authedUsersColumns"
            :data="authedUsers"
            :pagination="authedUsersPagination"
            :loading="authedUsersLoading"
            :bordered="false"
            :scroll-x="600"
            flex-height
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.role-users-all-table) {
  height: 100%;
}

:deep(.role-users-all-table .n-data-table-wrapper) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.role-users-all-table .n-data-table-base-table-body) {
  flex: 1;
  overflow-y: auto;
}

:deep(.role-users-all-table .n-data-table__pagination) {
  padding: 12px;
  border-top: 1px solid var(--border-color);
}

:deep(.role-users-authed-table) {
  height: 100%;
}

:deep(.role-users-authed-table .n-data-table-wrapper) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.role-users-authed-table .n-data-table-base-table-body) {
  flex: 1;
  overflow-y: auto;
}

:deep(.role-users-authed-table .n-data-table__pagination) {
  padding: 12px;
  border-top: 1px solid var(--border-color);
}
</style>
