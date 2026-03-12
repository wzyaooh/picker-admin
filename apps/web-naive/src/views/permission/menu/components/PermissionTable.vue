<script lang="ts" setup>
/**
 * 权限表格组件
 *
 * 显示权限菜单树形数据，包含菜单的基本信息、类型、路由、组件、权限标识、状态等。
 * 支持行选择、编辑、删除、按钮权限管理操作。表格列包括：选择、显示名称、类型、路由地址、组件路径、权限标识、状态、排序、操作。
 *
 * @example
 * ```vue
 * <PermissionTable
 *   :data="menuList"
 *   :loading="loading"
 *   :max-height="tableMaxHeight"
 *   v-model:checked-row-keys="checkedRowKeys"
 *   v-model:expanded-row-keys="expandedRowKeys"
 *   @edit="handleEdit"
 *   @delete="handleDelete"
 *   @button-permission="handleButtonPermission"
 * />
 * ```
 */

import type { DataTableColumns } from 'naive-ui';

import type { DictApi } from '#/api/modules/dict';

import { computed, h } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { NButton, NDataTable, NTag } from 'naive-ui';

/**
 * 菜单类型枚举
 */
type MenuType = 'BUTTON' | 'CATALOG' | 'MENU' | 'MODULE';

/**
 * 菜单记录类型
 */
type MenuRecord = {
  /** 子菜单列表 */
  children?: MenuRecord[];
  /** 组件路径 */
  componentPath?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否隐藏 */
  hidden: boolean;
  /** 图标 */
  icon?: string;
  /** 菜单ID */
  id: number;
  /** 模块编码 */
  moduleCode: string;
  /** 排序 */
  order: number;
  /** 父级ID */
  parentId: null | number;
  /** 路由地址 */
  path?: string;
  /** 权限标识 */
  permissionKey?: string;
  /** 显示名称 */
  title: string;
  /** 菜单类型 */
  type: MenuType;
};

/**
 * 组件 Props
 */
interface Props {
  /** 菜单数据列表 */
  data: MenuRecord[];
  /** 加载状态 */
  loading?: boolean;
  /** 表格最大高度 */
  maxHeight?: number;
  /** 选中的行键列表 */
  checkedRowKeys?: number[];
  /** 展开的行键列表 */
  expandedRowKeys?: number[];
  /** 权限类型字典数据 */
  permissionTypeDict?: DictApi.DictItem[];
}

/**
 * 组件 Emits
 */
interface Emits {
  /** 选中行变化时触发 */
  (e: 'update:checkedRowKeys', keys: number[]): void;
  /** 展开行变化时触发 */
  (e: 'update:expandedRowKeys', keys: number[]): void;
  /** 点击编辑按钮时触发 */
  (e: 'edit', row: MenuRecord): void;
  /** 点击删除按钮时触发 */
  (e: 'delete', row: MenuRecord): void;
  /** 点击按钮权限按钮时触发 */
  (e: 'buttonPermission', row: MenuRecord): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  maxHeight: 600,
  checkedRowKeys: () => [],
  expandedRowKeys: () => [],
  permissionTypeDict: () => [],
});

const emit = defineEmits<Emits>();

/**
 * 根据字典值获取标签和颜色
 *
 * @param value 字典值
 * @returns 标签和颜色配置
 */
function getDictConfig(value: string) {
  const item = props.permissionTypeDict.find((d) => d.value === value);
  if (item) {
    return {
      label: item.label,
      color: item.color || 'default',
    };
  }
  // 降级处理：如果字典未加载，使用默认值
  const fallbackMap: Record<string, { color: string; label: string }> = {
    MODULE: { label: '模块', color: 'primary' },
    CATALOG: { label: '目录', color: 'default' },
    MENU: { label: '菜单', color: 'info' },
    BUTTON: { label: '按钮', color: 'warning' },
  };
  return fallbackMap[value] || { label: value, color: 'default' };
}

/**
 * 表格列定义
 *
 * 定义表格的所有列，包括选择列、树形列、数据列和操作列。
 * 使用 computed 确保列定义响应式更新。
 */
const columns = computed((): DataTableColumns<MenuRecord> => {
  return [
    {
      type: 'selection',
      fixed: 'left',
      width: 48,
    },
    {
      title: '显示名称',
      key: 'title',
      fixed: 'left',
      width: 240,
      tree: true,
      render: (row) => {
        // 如果有图标，在名称前显示图标
        if (row.icon) {
          return h('span', { class: 'inline-flex items-center' }, [
            h(IconifyIcon, {
              icon: row.icon,
              style: {
                fontSize: '18px',
                marginRight: '8px',
              },
            }),
            h('span', row.title),
          ]);
        }
        return row.title;
      },
    },
    {
      title: '类型',
      key: 'type',
      width: 90,
      render: (row) => {
        const config = getDictConfig(row.type);
        return h(
          NTag,
          {
            size: 'small',
            bordered: false,
            type: config.color as any,
          },
          { default: () => config.label },
        );
      },
    },
    {
      title: '路由地址',
      key: 'path',
      minWidth: 200,
      ellipsis: { tooltip: true },
      render: (row) => row.path || '-',
    },
    {
      title: '组件路径',
      key: 'componentPath',
      minWidth: 200,
      ellipsis: { tooltip: true },
      render: (row) => {
        if (row.type === 'MENU' || row.type === 'CATALOG') {
          return row.componentPath || '-';
        }
        return '-';
      },
    },
    {
      title: '权限标识',
      key: 'permissionKey',
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row) => row.permissionKey || '-',
    },
    {
      title: '状态',
      key: 'enabled',
      width: 110,
      render: (row) =>
        h(
          NTag,
          {
            size: 'small',
            bordered: false,
            type: row.enabled ? 'success' : 'default',
          },
          { default: () => (row.enabled ? '启用' : '停用') },
        ),
    },
    {
      title: '排序',
      key: 'order',
      width: 80,
      render: (row) => row.order,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 220,
      render: (row) =>
        h('div', { class: 'flex items-center gap-3' }, [
          h(
            NButton,
            {
              text: true,
              type: 'primary',
              onClick: () => emit('edit', row),
            },
            { default: () => '编辑' },
          ),
          h(
            NButton,
            {
              text: true,
              type: 'error',
              onClick: () => emit('delete', row),
            },
            { default: () => '删除' },
          ),
          row.type === 'MENU'
            ? h(
                NButton,
                {
                  text: true,
                  type: 'info',
                  onClick: () => emit('buttonPermission', row),
                },
                { default: () => '按钮权限' },
              )
            : null,
        ]),
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

/**
 * 处理展开行变化
 *
 * @param keys 展开的行键列表
 */
function handleUpdateExpandedRowKeys(keys: any) {
  emit('update:expandedRowKeys', keys as number[]);
}
</script>

<template>
  <div class="mt-3 min-h-0 flex-1 rounded-md border border-border">
    <NDataTable
      :columns="columns"
      :data="data"
      :loading="loading"
      :row-key="(row) => row.id"
      :max-height="maxHeight"
      :scroll-x="1060"
      :checked-row-keys="checkedRowKeys"
      :expanded-row-keys="expandedRowKeys"
      striped
      @update:checked-row-keys="handleUpdateCheckedRowKeys"
      @update:expanded-row-keys="handleUpdateExpandedRowKeys"
    />
  </div>
</template>
