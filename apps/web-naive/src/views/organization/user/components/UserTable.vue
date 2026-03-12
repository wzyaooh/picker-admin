<script lang="ts" setup>
/**
 * 用户表格组件
 *
 * 显示用户列表数据，包含用户的基本信息、部门、岗位、角色、状态等。
 * 支持行选择、编辑、删除操作。表格列包括：ID、用户名、部门、岗位、角色、状态、创建时间、更新时间、操作。
 *
 * @example
 * ```vue
 * <UserTable
 *   :data="userList"
 *   :loading="loading"
 *   v-model:checked-row-keys="checkedRowKeys"
 *   @edit="handleEdit"
 *   @delete="handleDelete"
 * />
 * ```
 */

import type { DataTableColumns } from 'naive-ui';

import type { UserApi } from '#/api';

import { computed, h } from 'vue';

import { NButton, NDataTable, NSpace, NTag } from 'naive-ui';

/**
 * 用户记录类型
 * 包含用户基本信息和关联的部门、岗位、角色信息
 */
type UserRecord = {
  /** 用户资料（可选） */
  profile?: UserApi.UserProfile;
} & UserApi.User;

/**
 * 组件 Props
 */
interface Props {
  /** 用户数据列表 */
  data: UserRecord[];
  /** 加载状态 */
  loading?: boolean;
  /** 选中的行键列表 */
  checkedRowKeys?: number[];
}

/**
 * 组件 Emits
 */
interface Emits {
  /** 选中行变化时触发 */
  (e: 'update:checkedRowKeys', keys: number[]): void;
  /** 点击编辑按钮时触发 */
  (e: 'edit', row: UserRecord): void;
  /** 点击删除按钮时触发 */
  (e: 'delete', row: UserRecord): void;
  /** 点击重置密码按钮时触发 */
  (e: 'resetPassword', row: UserRecord): void;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  checkedRowKeys: () => [],
});

const emit = defineEmits<Emits>();

/**
 * 表格列定义
 *
 * 定义表格的所有列，包括选择列、数据列和操作列。
 * 使用 computed 确保列定义响应式更新。
 */
const columns = computed((): DataTableColumns<UserRecord> => {
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
      title: '用户名',
      key: 'username',
      minWidth: 160,
    },
    {
      title: '部门',
      key: 'department',
      width: 150,
      render: (row) => {
        if (!row.department) {
          return h('span', { class: 'text-muted-foreground' }, '未分配');
        }
        return h('span', {}, row.department.name);
      },
    },
    {
      title: '岗位',
      key: 'position',
      width: 150,
      render: (row) => {
        if (!row.position) {
          return h('span', { class: 'text-muted-foreground' }, '未分配');
        }
        return h('span', {}, row.position.name);
      },
    },
    {
      title: '角色',
      key: 'roles',
      minWidth: 200,
      render: (row) => {
        if (!row.roles || row.roles.length === 0) {
          return h('span', { class: 'text-muted-foreground' }, '未分配');
        }
        return h(
          NSpace,
          { size: 4 },
          {
            default: () =>
              row.roles!.map((role) =>
                h(
                  NTag,
                  { size: 'small', type: 'info', bordered: false },
                  { default: () => role.name },
                ),
              ),
          },
        );
      },
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
      title: '创建时间',
      key: 'createdAt',
      width: 180,
      render: (row) => new Date(row.createdAt).toLocaleString('zh-CN'),
    },
    {
      title: '更新时间',
      key: 'updatedAt',
      width: 180,
      render: (row) => new Date(row.updatedAt).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
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
                  onClick: () => emit('edit', row),
                },
                { default: () => '编辑' },
              ),
              h(
                NButton,
                {
                  size: 'tiny',
                  tertiary: true,
                  type: 'warning',
                  onClick: () => emit('resetPassword', row),
                },
                { default: () => '重置密码' },
              ),
              h(
                NButton,
                {
                  size: 'tiny',
                  tertiary: true,
                  type: 'error',
                  onClick: () => emit('delete', row),
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

/**
 * 处理选中行变化
 *
 * @param keys 选中的行键列表
 */
function handleUpdateCheckedRowKeys(keys: any) {
  emit('update:checkedRowKeys', keys as number[]);
}
</script>

<template>
  <NDataTable
    remote
    :loading="loading"
    :columns="columns"
    :data="data"
    :pagination="false"
    :row-key="(row) => row.id"
    :checked-row-keys="checkedRowKeys"
    :scroll-x="1100"
    striped
    @update:checked-row-keys="handleUpdateCheckedRowKeys"
  />
</template>
