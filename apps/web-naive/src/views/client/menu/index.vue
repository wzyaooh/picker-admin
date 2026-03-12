<script lang="ts" setup>
import type { DataTableColumns, SelectOption } from 'naive-ui';

import { computed, h, onMounted, ref, watch } from 'vue';

import { NButton, NCard, NDataTable, NInput, NTag, NRadioGroup, NRadioButton } from 'naive-ui';
import { IconifyIcon } from '@vben/icons';

import { dialog, message } from '#/adapter/naive';

import { useWindowSize } from '@vueuse/core';

import {
  createClientMenuApi,
  deleteClientMenuApi,
  updateClientMenuApi,
  getClientMenuTreeApi,
  getClientModuleListApi,
} from '#/api';

import type { BackendMenuType, FrontendMenuType, MenuRecord, Module } from './types';

import ApplyModal from './applyModal.vue';
import ButtonPermissionDrawer from './ButtonPermissionDrawer.vue';

defineOptions({ name: 'ClientMenuPage' });

const modules = ref<Module[]>([]);
const activeModuleCode = ref<string>('');
const keyword = ref('');
const loading = ref(false);

const menus = ref<MenuRecord[]>([]);

// Fetch modules from backend
async function fetchModules() {
  try {
    const result = await getClientModuleListApi({});
    
    // Backend returns { pageData, total }
    modules.value = (result.pageData || [])
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        order: m.order ?? 999,
      }))
      .sort((a, b) => a.order - b.order);
    
    // Set default active module
    if (modules.value.length > 0 && !activeModuleCode.value) {
      activeModuleCode.value = modules.value[0]?.code || '';
    }
  } catch (error) {
    message.error('加载模块列表失败');
  }
}

// Fetch menu tree from backend
async function fetchMenus() {
  if (!activeModuleCode.value) return;
  
  loading.value = true;
  try {
    const result = await getClientMenuTreeApi({ moduleCode: activeModuleCode.value });
    menus.value = transformMenuTree(result);
  } catch (error) {
    message.error('加载菜单列表失败');
  } finally {
    loading.value = false;
  }
}

// Transform backend menu tree to UI format
function transformMenuTree(nodes: any[]): MenuRecord[] {
  return nodes.map(node => ({
    id: node.id,
    moduleCode: node.moduleCode || activeModuleCode.value,
    parentId: node.parentId !== undefined && node.parentId !== null ? node.parentId : null,
    name: node.name,
    type: node.type as BackendMenuType,
    path: node.path,
    icon: node.icon,
    component: node.component,
    code: node.code,
    hidden: node.hidden ?? false,
    enable: node.enable ?? true,
    order: node.order ?? 999,
    children: node.children?.length ? transformMenuTree(node.children) : undefined,
  }));
}

// Watch module change to reload menus
watch(activeModuleCode, () => {
  if (activeModuleCode.value) {
    fetchMenus();
  }
});

// Load modules and menus on mount
onMounted(async () => {
  await fetchModules();
  // 不需要手动调用 fetchMenus()，watch 会自动触发
});

function flattenMenuTree(list: MenuRecord[]) {
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

const allMenuNodes = computed(() => {
  // 包含当前模块节点和所有菜单节点
  const currentModule = modules.value.find(m => m.code === activeModuleCode.value);
  
  if (!currentModule) {
    // 如果没有找到当前模块，只返回菜单节点
    return flattenMenuTree(menus.value);
  }
  
  const moduleNode: MenuRecord = {
    id: currentModule.id,
    name: currentModule.name,
    type: 'MODULE',
    moduleCode: activeModuleCode.value,
    parentId: null,
    enable: true,
    hidden: false,
    order: currentModule.order,
  };
  
  const flatMenus = flattenMenuTree(menus.value);
  
  // 添加模块节点到列表开头
  return [moduleNode, ...flatMenus];
});

function filterTree(nodes: MenuRecord[], predicate: (n: MenuRecord) => boolean): MenuRecord[] {
  const walk = (list: MenuRecord[]): MenuRecord[] => {
    const result: MenuRecord[] = [];
    list.forEach((n) => {
      const children = n.children?.length ? walk(n.children) : [];
      const matched = predicate(n);
      if (matched || children.length) {
        result.push({ ...n, children: children.length ? children : undefined });
      }
    });
    return result;
  };
  return walk(nodes);
}

const filteredMenus = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return filterTree(menus.value, (n) => {
    if (!kw) return true;
    return n.name.toLowerCase().includes(kw);
  });
});

const parentOptions = computed((): SelectOption[] => {
  // 根据当前编辑的菜单类型，过滤可选的父级
  // 注意：modalInitialValues.value.type 是后端类型（CATALOG/MENU/BUTTON）
  const editingType = modalInitialValues.value.type;
  
  // 如果类型未设置，返回空数组
  if (!editingType) {
    return [];
  }
  
  const options = allMenuNodes.value
    .filter((n) => {
      // 按钮类型不能作为父级
      if (n.type === 'BUTTON') return false;
      
      // 编辑模式：不能选择自己作为父级
      if (modalMode.value === 'edit' && editingId.value && n.id === editingId.value) {
        return false;
      }
      
      // 如果是菜单类型（MENU），只能选择目录（CATALOG）作为父级
      if (editingType === 'MENU') {
        return n.type === 'CATALOG';
      }
      
      // 如果是目录类型（CATALOG），只能选择模块（MODULE）作为父级
      if (editingType === 'CATALOG') {
        return n.type === 'MODULE';
      }
      
      // 如果是按钮类型（BUTTON），只能选择菜单（MENU）作为父级
      if (editingType === 'BUTTON') {
        return n.type === 'MENU';
      }
      
      // 其他情况允许所有非按钮类型
      return true;
    })
    .map((n) => ({ label: n.name, value: n.id }));
  
  return options;
});

const checkedRowKeys = ref<number[]>([]);
const expandedRowKeys = ref<number[]>([]);

// 按钮权限抽屉
const buttonDrawerShow = ref(false);
const selectedMenuId = ref<number | null>(null);
const selectedMenuName = ref('');

function openButtonDrawer(row: MenuRecord) {
  selectedMenuId.value = row.id;
  selectedMenuName.value = row.name;
  buttonDrawerShow.value = true;
}

const { height: windowHeight } = useWindowSize();
const pageHeight = computed(() => Math.max(640, windowHeight.value - 140));
const tableMaxHeight = computed(() => Math.max(360, pageHeight.value - 220));

const modalOpen = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const modalInitialValues = ref<
  Partial<{
    component: string;
    enable: boolean;
    hidden: boolean;
    icon: string;
    order: number;
    parentId: number | null;
    path: string;
    code: string;
    name: string;
    type: BackendMenuType; // 使用后端 MenuType
  }>
>({});

const editingId = ref<number | null>(null);

function openCreateMenu() {
  modalMode.value = 'create';
  editingId.value = null;
  
  // 查找当前选中模块的ID
  const currentModule = modules.value.find(m => m.code === activeModuleCode.value);
  const moduleId = currentModule?.id || null;
  
  modalInitialValues.value = {
    parentId: moduleId, // 默认父级为当前选中的模块
    name: '',
    type: 'CATALOG', // 使用后端类型，不需要 as any
    path: '',
    code: '',
    icon: '',
    component: '',
    hidden: false,
    enable: true,
    order: 999,
  };
  modalOpen.value = true;
}

function openEditMenu(row: MenuRecord) {
  modalMode.value = 'edit';
  editingId.value = row.id;
  
  modalInitialValues.value = {
    parentId: row.parentId,
    name: row.name,
    type: row.type, // 直接使用后端类型，不需要 as any
    path: row.path,
    code: row.code,
    icon: row.icon,
    component: row.component,
    hidden: row.hidden,
    enable: row.enable,
    order: row.order,
  };
  modalOpen.value = true;
}

function deleteMenu(row: MenuRecord) {
  dialog.warning({
    title: '删除确认',
    content: `确定删除「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteClientMenuApi(row.id);
        message.success('删除成功');
        await fetchMenus();
        checkedRowKeys.value = checkedRowKeys.value.filter((k) => k !== row.id);
      } catch (error) {
        // Error already handled by interceptor
      }
    },
  });
}

function batchDelete() {
  if (!checkedRowKeys.value.length) {
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
        // Delete each menu one by one
        for (const id of checkedRowKeys.value) {
          await deleteClientMenuApi(id);
        }
        message.success('删除成功');
        await fetchMenus();
        checkedRowKeys.value = [];
      } catch (error) {
        // Error already handled by interceptor
      }
    },
  });
}

function refresh() {
  fetchMenus();
  message.success('刷新成功');
}

function expandAll() {
  expandedRowKeys.value = filteredMenus.value.map((n) => n.id);
}

function collapseAll() {
  expandedRowKeys.value = [];
}

function handleSubmit(val: any) {
  if (modalMode.value === 'create') {
    createMenu(val);
  } else if (modalMode.value === 'edit' && editingId.value) {
    updateMenu(editingId.value, val);
  }
}

function handleTypeChange(type: FrontendMenuType) {
  // 将前端类型转换为后端类型
  const backendType: BackendMenuType = type === 'directory' ? 'CATALOG' : 'MENU';
  
  // 更新 modalInitialValues 的类型，触发 parentOptions 重新计算
  modalInitialValues.value.type = backendType;
  
  // 如果切换到菜单类型，清空 parentId（因为需要选择目录）
  // 如果切换到目录类型，恢复为模块ID
  if (type === 'menu') {
    modalInitialValues.value.parentId = null;
  } else {
    const currentModule = modules.value.find(m => m.code === activeModuleCode.value);
    modalInitialValues.value.parentId = currentModule?.id || null;
  }
}

async function createMenu(val: any) {
  try {
    await createClientMenuApi({
      moduleCode: activeModuleCode.value,
      name: val.name,
      code: val.code || val.name,
      type: val.type,
      path: val.type === 'BUTTON' ? undefined : val.path,
      icon: val.icon,
      component: val.type === 'MENU' ? val.component : val.type === 'CATALOG' ? 'Layout' : undefined,
      parentId: val.parentId || undefined,
      order: val.order,
      enable: val.enable,
      hidden: val.hidden,
    });
    message.success('新增成功');
    modalOpen.value = false;
    await fetchMenus();
  } catch (error) {
    // Error already handled by interceptor
  }
}

async function updateMenu(id: number, val: any) {
  try {
    const updateData = {
      moduleCode: activeModuleCode.value,
      name: val.name,
      code: val.code || val.name,
      type: val.type,
      path: val.type === 'BUTTON' ? undefined : val.path,
      icon: val.icon,
      component: val.type === 'MENU' ? val.component : val.type === 'CATALOG' ? 'Layout' : undefined,
      parentId: val.parentId || undefined,
      order: val.order,
      enable: val.enable,
      hidden: val.hidden,
    };
    await updateClientMenuApi(id, updateData);
    message.success('保存成功');
    modalOpen.value = false;
    await fetchMenus();
  } catch (error) {
    // Error already handled by interceptor
  }
}

// 获取菜单类型标签配置
function getTypeConfig(type: BackendMenuType) {
  const typeMap: Record<BackendMenuType, { label: string; color: string }> = {
    MODULE: { label: '模块', color: 'primary' },
    CATALOG: { label: '目录', color: 'default' },
    MENU: { label: '菜单', color: 'info' },
    BUTTON: { label: '按钮', color: 'warning' },
  };
  return typeMap[type] || { label: type, color: 'default' };
}

const columns = computed((): DataTableColumns<MenuRecord> => {
  return [
    {
      type: 'selection',
      fixed: 'left',
      width: 48,
    },
    {
      title: '显示名称',
      key: 'name',
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
              } 
            }),
            h('span', row.name),
          ]);
        }
        return row.name;
      },
    },
    {
      title: '类型',
      key: 'type',
      width: 90,
      render: (row) => {
        const config = getTypeConfig(row.type);
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
      key: 'component',
      minWidth: 200,
      ellipsis: { tooltip: true },
      render: (row) => {
        if (row.type === 'MENU' || row.type === 'CATALOG') {
          return row.component || '-';
        }
        return '-';
      },
    },
    {
      title: '权限标识',
      key: 'code',
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: (row) => row.code || '-',
    },
    {
      title: '状态',
      key: 'enable',
      width: 110,
      render: (row) =>
        h(
          NTag,
          { size: 'small', bordered: false, type: row.enable ? 'success' : 'default' },
          { default: () => (row.enable ? '启用' : '停用') },
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
            { text: true, type: 'primary', onClick: () => openEditMenu(row) },
            { default: () => '编辑' },
          ),
          h(
            NButton,
            { text: true, type: 'error', onClick: () => deleteMenu(row) },
            { default: () => '删除' },
          ),
          row.type === 'MENU'
            ? h(
                NButton,
                { text: true, type: 'info', onClick: () => openButtonDrawer(row) },
                { default: () => '按钮权限' },
              )
            : null,
        ]),
    },
  ];
});
</script>

<template>
  <div class="p-4" :style="{ height: `${pageHeight}px` }">
    <NCard :bordered="false" size="small" class="h-full" content-style="height: 100%; display: flex; flex-direction: column;">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="text-muted-foreground text-sm">模块:</div>
          <NRadioGroup v-model:value="activeModuleCode" size="small">
            <NRadioButton
              v-for="m in modules"
              :key="m.code"
              :value="m.code"
              :label="m.name"
            />
          </NRadioGroup>
        </div>

        <div class="flex items-center gap-2">
          <NInput
            v-model:value="keyword"
            clearable
            placeholder="请输入菜单名称关键字"
            class="w-[320px]"
          />
        </div>
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <NButton type="primary" @click="openCreateMenu">+ 新增菜单</NButton>
          <NButton tertiary type="error" @click="batchDelete">批量删除</NButton>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <NButton tertiary @click="expandAll">展开</NButton>
          <NButton tertiary @click="collapseAll">折叠</NButton>
          <NButton tertiary @click="refresh">刷新</NButton>
        </div>
      </div>

      <div class="mt-3 flex-1 min-h-0 rounded-md border border-border">
        <NDataTable
          :columns="columns"
          :data="filteredMenus"
          :loading="loading"
          :row-key="(row) => row.id"
          :max-height="tableMaxHeight"
          :scroll-x="1060"
          v-model:checked-row-keys="checkedRowKeys"
          v-model:expanded-row-keys="expandedRowKeys"
          striped
        />
      </div>

      <ApplyModal
        v-model:show="modalOpen"
        :mode="modalMode"
        :initial-values="modalInitialValues"
        :parent-options="parentOptions"
        @submit="handleSubmit"
        @update:type="handleTypeChange"
      />

      <ButtonPermissionDrawer
        v-model:show="buttonDrawerShow"
        :menu-id="selectedMenuId"
        :menu-name="selectedMenuName"
        @refresh="fetchMenus"
      />
    </NCard>
  </div>
</template>
