<script lang="ts" setup>
/**
 * 权限菜单管理页面
 *
 * 提供权限菜单的增删改查功能，包括：
 * - 模块切换
 * - 菜单树形展示（支持搜索、展开/折叠）
 * - 新增菜单（目录/菜单）
 * - 编辑菜单
 * - 删除菜单（单个/批量）
 * - 按钮权限管理
 */

import type { SelectOption } from 'naive-ui';

import type { DictApi } from '#/api/modules/dict';

import { computed, onMounted, ref, watch } from 'vue';

import { useWindowSize } from '@vueuse/core';
import { NCard } from 'naive-ui';

import { dialog, message } from '#/adapter/naive';
import {
  createPermissionApi,
  deletePermissionApi,
  getPermissionTreeApi,
  updatePermissionApi,
  clearPermissionCacheApi,
} from '#/api';
import { DICT_CODES, getDictItems } from '#/utils/dict';

import {
  ApplyModal,
  ButtonPermissionDrawer,
  PermissionFilter,
  PermissionTable,
} from './components';

defineOptions({ name: 'PermissionMenuPage' });

// ==================== 类型定义 ====================

/**
 * 菜单类型枚举
 */
type MenuType = 'BUTTON' | 'CATALOG' | 'MENU' | 'MODULE';

/**
 * 模块类型
 */
type Module = {
  code: string;
  icon?: string;
  id: number;
  name: string;
  order: number;
};

/**
 * 菜单记录类型
 */
type MenuRecord = {
  children?: MenuRecord[];
  componentPath?: string;
  description?: string;
  enabled: boolean;
  hidden: boolean;
  icon?: string;
  id: number;
  keepAlive?: boolean;
  layout?: string;
  moduleCode: string;
  order: number;
  parentId: null | number;
  path?: string;
  permissionKey?: string;
  redirect?: string;
  title: string;
  type: MenuType;
};

// ==================== 状态管理 ====================

const modules = ref<Module[]>([]);
const activeModuleCode = ref<string>('');
const keyword = ref('');
const loading = ref(false);
const menus = ref<MenuRecord[]>([]);
const allPermissionsCache = ref<any[]>([]);
const permissionTypeDict = ref<DictApi.DictItem[]>([]);
const checkedRowKeys = ref<number[]>([]);
const expandedRowKeys = ref<number[]>([]);

// 按钮权限抽屉
const buttonDrawerShow = ref(false);
const selectedMenuId = ref<null | number>(null);
const selectedMenuName = ref('');

// 弹窗管理
const modalOpen = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const modalInitialValues = ref<
  Partial<{
    componentPath: string;
    description: string;
    enabled: boolean;
    hidden: boolean;
    icon: string;
    keepAlive: boolean;
    layout: string;
    order: number;
    parentId: null | number;
    path: string;
    permissionKey: string;
    redirect: string;
    title: string;
    type: MenuType;
  }>
>({});
const editingId = ref<null | number>(null);

// ==================== 计算属性 ====================

const { height: windowHeight } = useWindowSize();
const pageHeight = computed(() => Math.max(640, windowHeight.value - 140));
const tableMaxHeight = computed(() => Math.max(360, pageHeight.value - 220));

/**
 * 过滤后的菜单树
 */
const filteredMenus = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return filterTree(menus.value, (n) => {
    if (!kw) return true;
    return n.title.toLowerCase().includes(kw);
  });
});

/**
 * 所有菜单节点（扁平化）
 */
const allMenuNodes = computed(() => {
  const currentModule = modules.value.find(
    (m) => m.code === activeModuleCode.value,
  );
  const moduleNode: MenuRecord | null = currentModule
    ? {
        id: currentModule.id,
        title: currentModule.name,
        type: 'MODULE' as MenuType,
        moduleCode: activeModuleCode.value,
        parentId: null,
        enabled: true,
        hidden: false,
        order: currentModule.order,
      }
    : null;

  const flatMenus = flattenMenuTree(menus.value);
  return moduleNode ? [moduleNode, ...flatMenus] : flatMenus;
});

/**
 * 父级选项列表
 */
const parentOptions = computed((): SelectOption[] => {
  const editingType = modalInitialValues.value.type;

  const options = allMenuNodes.value
    .filter((n) => {
      if (n.type === 'BUTTON') return false;
      if (
        modalMode.value === 'edit' &&
        editingId.value &&
        n.id === editingId.value
      ) {
        return false;
      }
      if (editingType === 'MENU') {
        return n.type === 'CATALOG';
      }
      if (editingType === 'CATALOG') {
        return n.type === 'MODULE';
      }
      return true;
    })
    .map((n) => ({ label: n.title, value: n.id }));

  return options;
});

// ==================== 工具函数 ====================

/**
 * 扁平化菜单树
 */
function flattenMenuTree(list: MenuRecord[]): MenuRecord[] {
  const result: MenuRecord[] = [];
  const walk = (nodes: MenuRecord[]) => {
    nodes.forEach((n) => {
      result.push(n);
      if (n.children?.length) walk(n.children);
    });
  };
  walk(list);
  return result;
}

/**
 * 过滤树形数据
 */
function filterTree(
  nodes: MenuRecord[],
  predicate: (n: MenuRecord) => boolean,
): MenuRecord[] {
  const walk = (list: MenuRecord[]): MenuRecord[] => {
    const result: MenuRecord[] = [];
    list.forEach((n) => {
      const children = n.children?.length ? walk(n.children) : [];
      const matched = predicate(n);
      if (matched || children.length > 0) {
        result.push({
          ...n,
          children: children.length > 0 ? children : undefined,
        });
      }
    });
    return result;
  };
  return walk(nodes);
}

/**
 * 转换后端菜单树为前端格式
 */
function transformMenuTree(nodes: any[]): MenuRecord[] {
  return nodes.map((node) => ({
    id: node.id,
    moduleCode: activeModuleCode.value,
    parentId:
      node.parentId !== undefined && node.parentId !== null
        ? node.parentId
        : null,
    title: node.name,
    type: node.type as MenuType,
    path: node.path,
    icon: node.icon,
    componentPath: node.component,
    permissionKey: node.code,
    hidden: !node.show,
    enabled: node.enable ?? true,
    order: node.order ?? 999,
    redirect: node.redirect,
    layout: node.layout,
    keepAlive: node.keepAlive ?? true,
    description: node.description,
    children: node.children?.length
      ? transformMenuTree(node.children)
      : undefined,
  }));
}

// ==================== 数据获取 ====================

/**
 * 加载字典数据
 */
async function loadDictionaries() {
  try {
    permissionTypeDict.value = await getDictItems(DICT_CODES.PERMISSION_TYPE);
  } catch (error) {
    console.error('Failed to load dictionaries:', error);
  }
}

/**
 * 加载完整权限树（带缓存）
 */
async function loadPermissionTree(forceRefresh = false) {
  if (allPermissionsCache.value.length > 0 && !forceRefresh) {
    return allPermissionsCache.value;
  }

  try {
    const allPermissions = await getPermissionTreeApi();
    allPermissionsCache.value = allPermissions;
    return allPermissions;
  } catch (error) {
    console.error('Failed to fetch permission tree:', error);
    throw error;
  }
}

/**
 * 获取模块列表
 */
async function fetchModules() {
  try {
    const allPermissions = await loadPermissionTree();

    modules.value = allPermissions
      .filter((p: any) => p.type === 'MODULE')
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        icon: m.icon,
        order: m.order ?? 999,
      }))
      .toSorted((a, b) => a.order - b.order);

    if (modules.value.length > 0 && !activeModuleCode.value) {
      activeModuleCode.value = modules.value[0]?.code || '';
    }
  } catch {
    message.error('加载模块列表失败');
  }
}

/**
 * 获取菜单列表
 */
async function fetchMenus() {
  if (!activeModuleCode.value) return;

  loading.value = true;
  try {
    const allPermissions = await loadPermissionTree();

    const currentModule = allPermissions.find(
      (p: any) => p.type === 'MODULE' && p.code === activeModuleCode.value,
    );

    menus.value = currentModule?.children
      ? transformMenuTree(currentModule.children)
      : [];
  } catch {
    message.error('加载菜单列表失败');
  } finally {
    loading.value = false;
  }
}

// ==================== 操作处理 ====================

/**
 * 打开创建菜单弹窗
 */
function handleCreate() {
  modalMode.value = 'create';
  editingId.value = null;

  const currentModule = modules.value.find(
    (m) => m.code === activeModuleCode.value,
  );
  const moduleId = currentModule?.id || null;

  modalInitialValues.value = {
    parentId: moduleId,
    title: '',
    type: 'CATALOG' as any,
    path: '',
    permissionKey: '',
    icon: '',
    componentPath: '',
    hidden: false,
    enabled: true,
    order: 999,
    redirect: '',
    layout: 'default',
    keepAlive: true,
    description: '',
  };
  modalOpen.value = true;
}

/**
 * 打开编辑菜单弹窗
 */
function handleEdit(row: MenuRecord) {
  modalMode.value = 'edit';
  editingId.value = row.id;

  modalInitialValues.value = {
    parentId: row.parentId,
    title: row.title,
    type: row.type as any,
    path: row.path,
    permissionKey: row.permissionKey,
    icon: row.icon,
    componentPath: row.componentPath,
    hidden: row.hidden,
    enabled: row.enabled,
    order: row.order,
    redirect: row.redirect,
    layout: row.layout,
    keepAlive: row.keepAlive,
    description: row.description,
  };
  modalOpen.value = true;
}

/**
 * 删除菜单
 */
function handleDelete(row: MenuRecord) {
  dialog.warning({
    title: '删除确认',
    content: `确定删除「${row.title}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deletePermissionApi(row.id);
        message.success('删除成功');
        allPermissionsCache.value = [];
        await fetchModules();
        await fetchMenus();
        checkedRowKeys.value = checkedRowKeys.value.filter((k) => k !== row.id);
      } catch {
        // Error already handled by interceptor
      }
    },
  });
}

/**
 * 批量删除菜单
 */
function handleBatchDelete() {
  if (checkedRowKeys.value.length === 0) {
    message.warning('请选择要删除的菜单');
    return;
  }
  dialog.warning({
    title: '批量删除',
    content: `确定删除选中的 ${checkedRowKeys.value.length} 条记录吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        for (const id of checkedRowKeys.value) {
          await deletePermissionApi(id);
        }
        message.success('删除成功');
        allPermissionsCache.value = [];
        await fetchModules();
        await fetchMenus();
        checkedRowKeys.value = [];
      } catch {
        // Error already handled by interceptor
      }
    },
  });
}

/**
 * 刷新数据
 */
function handleRefresh() {
  allPermissionsCache.value = [];
  fetchModules().then(() => {
    if (activeModuleCode.value) {
      fetchMenus();
    }
  });
  message.success('刷新成功');
}

/**
 * 清理后端缓存并刷新数据
 */
async function handleClearCache() {
  try {
    const result = await clearPermissionCacheApi();
    if (result.success) {
      message.success('后端缓存清理成功');
      // 清理前端缓存并重新加载数据
      allPermissionsCache.value = [];
      await fetchModules();
      if (activeModuleCode.value) {
        await fetchMenus();
      }
    } else {
      message.error(`缓存清理失败: ${result.message}`);
    }
  } catch (error) {
    message.error('缓存清理失败');
  }
}

/**
 * 展开所有节点
 */
function handleExpandAll() {
  expandedRowKeys.value = flattenMenuTree(filteredMenus.value).map((n) => n.id);
}

/**
 * 折叠所有节点
 */
function handleCollapseAll() {
  expandedRowKeys.value = [];
}

/**
 * 打开按钮权限抽屉
 */
function handleButtonPermission(row: MenuRecord) {
  selectedMenuId.value = row.id;
  selectedMenuName.value = row.title;
  buttonDrawerShow.value = true;
}

/**
 * 处理表单提交
 */
function handleSubmit(val: any) {
  if (modalMode.value === 'create') {
    createMenu(val);
  } else if (modalMode.value === 'edit' && editingId.value) {
    updateMenu(editingId.value, val);
  }
}

/**
 * 处理类型变化
 */
function handleTypeChange(type: 'directory' | 'menu') {
  const backendType = type === 'directory' ? 'CATALOG' : 'MENU';

  if (modalInitialValues.value) {
    modalInitialValues.value.type = backendType as any;

    if (type === 'menu') {
      modalInitialValues.value.parentId = null;
    } else {
      const currentModule = modules.value.find(
        (m) => m.code === activeModuleCode.value,
      );
      modalInitialValues.value.parentId = currentModule?.id || null;
    }
  }
}

/**
 * 根据类型获取组件路径
 */
function getComponentByType(val: any): string | undefined {
  if (val.type === 'MENU') return val.componentPath;
  if (val.type === 'CATALOG') return 'Layout';
  return undefined;
}

/**
 * 创建菜单
 */
async function createMenu(val: any) {
  try {
    await createPermissionApi({
      name: val.title,
      code: val.permissionKey || val.title,
      type: val.type,
      path: val.type === 'BUTTON' ? undefined : val.path,
      redirect: val.redirect || undefined,
      icon: val.icon,
      component: getComponentByType(val),
      layout: val.type === 'MENU' ? val.layout || 'default' : undefined,
      keepAlive: val.type === 'MENU' ? val.keepAlive : undefined,
      parentId: val.parentId || undefined,
      order: val.order,
      enable: val.enabled,
      show: !val.hidden,
      description: val.description || '',
    });
    message.success('新增成功');
    modalOpen.value = false;
    allPermissionsCache.value = [];
    await fetchModules();
    await fetchMenus();
  } catch {
    // Error already handled by interceptor
  }
}

/**
 * 更新菜单
 */
async function updateMenu(id: number, val: any) {
  try {
    await updatePermissionApi(id, {
      name: val.title,
      code: val.permissionKey || val.title,
      type: val.type,
      path: val.type === 'BUTTON' ? undefined : val.path,
      redirect: val.redirect || undefined,
      icon: val.icon,
      component: getComponentByType(val),
      layout: val.type === 'MENU' ? val.layout || 'default' : undefined,
      keepAlive: val.type === 'MENU' ? val.keepAlive : undefined,
      parentId: val.parentId || undefined,
      order: val.order,
      enable: val.enabled,
      show: !val.hidden,
      description: val.description || undefined,
    });
    message.success('保存成功');
    modalOpen.value = false;
    allPermissionsCache.value = [];
    await fetchModules();
    await fetchMenus();
  } catch {
    // Error already handled by interceptor
  }
}

// ==================== 生命周期 ====================

watch(activeModuleCode, () => {
  if (activeModuleCode.value) {
    fetchMenus();
  }
});

onMounted(async () => {
  await loadDictionaries();
  await fetchModules();
  if (activeModuleCode.value) {
    await fetchMenus();
  }
});
</script>

<template>
  <div class="p-4" :style="{ height: `${pageHeight}px` }">
    <NCard
      :bordered="false"
      size="small"
      class="h-full"
      content-style="height: 100%; display: flex; flex-direction: column;"
    >
      <!-- 筛选组件 -->
      <PermissionFilter
        v-model:keyword="keyword"
        v-model:active-module-code="activeModuleCode"
        :modules="modules"
        :loading="loading"
        :checked-count="checkedRowKeys.length"
        @create="handleCreate"
        @batch-delete="handleBatchDelete"
        @expand-all="handleExpandAll"
        @collapse-all="handleCollapseAll"
        @refresh="handleRefresh"
        @clear-cache="handleClearCache"
      />

      <!-- 表格组件 -->
      <PermissionTable
        :data="filteredMenus"
        :loading="loading"
        :max-height="tableMaxHeight"
        :permission-type-dict="permissionTypeDict"
        v-model:checked-row-keys="checkedRowKeys"
        v-model:expanded-row-keys="expandedRowKeys"
        @edit="handleEdit"
        @delete="handleDelete"
        @button-permission="handleButtonPermission"
      />

      <!-- 弹窗 -->
      <ApplyModal
        v-model:show="modalOpen"
        :mode="modalMode"
        :initial-values="modalInitialValues as any"
        :parent-options="parentOptions"
        @submit="handleSubmit"
        @update:type="handleTypeChange"
      />

      <!-- 按钮权限抽屉 -->
      <ButtonPermissionDrawer
        v-model:show="buttonDrawerShow"
        :menu-id="selectedMenuId"
        :menu-name="selectedMenuName"
        @refresh="fetchMenus"
      />
    </NCard>
  </div>
</template>
