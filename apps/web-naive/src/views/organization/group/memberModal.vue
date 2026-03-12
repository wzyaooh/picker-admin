<script setup lang="ts">
import type { DataTableColumns, SelectOption } from 'naive-ui';

import { computed, h, onMounted, ref, watch } from 'vue';

import {
  NButton,
  NDataTable,
  NModal,
  NSelect,
  NSpace,
  NTag,
} from 'naive-ui';

import { message } from '#/adapter/naive';

import {
  addUserGroupMembersApi,
  getUserGroupApi,
  getUserListApi,
  removeUserGroupMemberApi,
  type UserGroupApi,
} from '#/api';

interface Props {
  groupId: number | null;
  groupName: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{ updated: [] }>();

const show = defineModel<boolean>('show', { required: true });

const loading = ref(false);
const members = ref<UserGroupApi.UserMember[]>([]);

// Available users for selection
const availableUsers = ref<SelectOption[]>([]);
const selectedUserIds = ref<number[]>([]);
const loadingUsers = ref(false);

async function fetchGroupMembers() {
  if (!props.groupId) return;

  loading.value = true;
  try {
    const group = await getUserGroupApi(props.groupId);
    members.value = group.members || [];
  } catch (error) {
    console.error('Failed to fetch group members:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchAvailableUsers() {
  loadingUsers.value = true;
  try {
    const result = await getUserListApi({ pageSize: 100 });
    
    // Filter out users who are already members
    const memberIds = new Set(members.value.map((m) => m.id));
    availableUsers.value = result.pageData
      .filter((user) => !memberIds.has(user.id))
      .map((user) => ({
        label: user.username,
        value: user.id,
      }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
  } finally {
    loadingUsers.value = false;
  }
}

watch(
  () => show.value,
  (val) => {
    if (val && props.groupId) {
      fetchGroupMembers();
      fetchAvailableUsers();
      selectedUserIds.value = [];
    }
  },
);

async function handleAddMembers() {
  if (!props.groupId || selectedUserIds.value.length === 0) {
    message.warning('请选择要添加的用户');
    return;
  }

  try {
    await addUserGroupMembersApi(props.groupId, {
      userIds: selectedUserIds.value,
    });
    message.success('添加成功');
    selectedUserIds.value = [];
    await fetchGroupMembers();
    await fetchAvailableUsers();
    emit('updated');
  } catch (error) {
    // Error already handled by interceptor
  }
}

async function handleRemoveMember(userId: number) {
  if (!props.groupId) return;

  try {
    await removeUserGroupMemberApi(props.groupId, userId);
    message.success('移除成功');
    await fetchGroupMembers();
    await fetchAvailableUsers();
    emit('updated');
  } catch (error) {
    // Error already handled by interceptor
  }
}

const columns = computed((): DataTableColumns<UserGroupApi.UserMember> => {
  return [
    {
      title: 'ID',
      key: 'id',
      width: 80,
    },
    {
      title: '用户名',
      key: 'username',
      minWidth: 160,
    },
    {
      title: '状态',
      key: 'enabled',
      width: 90,
      render: (row) => {
        return h(
          NTag,
          { type: row.enabled ? 'success' : 'default', size: 'small' },
          {
            default: () => (row.enabled ? '启用' : '停用'),
          },
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (row) => {
        return h(
          NButton,
          {
            size: 'tiny',
            tertiary: true,
            type: 'error',
            onClick: () => handleRemoveMember(row.id),
          },
          { default: () => '移除' },
        );
      },
    },
  ];
});
</script>

<template>
  <NModal
    v-model:show="show"
    preset="card"
    :title="`管理成员 - ${groupName}`"
    class="w-[700px]"
  >
    <div class="mb-4">
      <div class="mb-2 text-sm font-medium">添加成员</div>
      <NSpace align="center">
        <NSelect
          v-model:value="selectedUserIds"
          :options="availableUsers"
          :loading="loadingUsers"
          multiple
          placeholder="请选择要添加的用户"
          clearable
          class="flex-1 min-w-[300px]"
        />
        <NButton
          type="primary"
          :disabled="selectedUserIds.length === 0"
          @click="handleAddMembers"
        >
          添加
        </NButton>
      </NSpace>
    </div>

    <div>
      <div class="mb-2 text-sm font-medium">
        当前成员 ({{ members.length }})
      </div>
      <NDataTable
        :loading="loading"
        :columns="columns"
        :data="members"
        :pagination="false"
        :row-key="(row) => row.id"
        :max-height="400"
        striped
      />
    </div>

    <template #footer>
      <div class="flex justify-end">
        <NButton @click="show = false">关闭</NButton>
      </div>
    </template>
  </NModal>
</template>
