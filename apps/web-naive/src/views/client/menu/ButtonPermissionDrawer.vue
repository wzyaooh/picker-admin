<script lang="ts" setup>
import { ref, watch, h } from 'vue';
import { NDrawer, NButton, NDataTable, NSpin, NInput, NInputNumber, NModal, NForm, NFormItem } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { message } from '#/adapter/naive';
import { getClientMenuButtonsApi, createClientMenuApi, updateClientMenuApi, deleteClientMenuApi, type ClientApi } from '#/api';

interface Props {
  show: boolean;
  menuId: number | null;
  menuName: string;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'refresh'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const loading = ref(false);
const buttons = ref<ClientApi.Menu[]>([]);

// 新增按钮表单
const showAddModal = ref(false);
const newButtonName = ref('');
const newButtonCode = ref('');
const newButtonOrder = ref(999);
const addingButton = ref(false);
const formRef = ref<any>(null);

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入按钮名称', trigger: 'blur' },
    { min: 1, max: 50, message: '名称长度在 1 到 50 个字符', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入按钮编码', trigger: 'blur' },
    { min: 1, max: 100, message: '编码长度在 1 到 100 个字符', trigger: 'blur' },
  ],
  order: [
    { type: 'number' as const, required: true, message: '请输入排序值', trigger: 'blur' },
  ],
};

// 编辑状态
const editingId = ref<number | null>(null);
const editingName = ref('');
const editingCode = ref('');
const editingOrder = ref(999);
const updatingButton = ref(false);

// 加载按钮权限列表
async function loadButtons() {
  if (!props.menuId) return;
  
  loading.value = true;
  try {
    const result = await getClientMenuButtonsApi(props.menuId);
    buttons.value = result;
  } catch (error) {
    console.error('Failed to load button permissions:', error);
    message.error('加载按钮权限失败');
  } finally {
    loading.value = false;
  }
}

// 监听抽屉打开，加载数据
watch(() => props.show, (newVal) => {
  if (newVal && props.menuId) {
    loadButtons();
    showAddModal.value = false;
    editingId.value = null;
    resetForm();
  }
});

// 重置表单
function resetForm() {
  newButtonName.value = '';
  newButtonCode.value = '';
  newButtonOrder.value = 999;
  // 重置表单验证状态
  formRef.value?.restoreValidation();
}

// 显示新增弹窗
function handleShowAddModal() {
  editingId.value = null;
  resetForm();
  showAddModal.value = true;
}

// 取消新增
function handleCancelAdd() {
  showAddModal.value = false;
  resetForm();
}

// 开始编辑
function handleEdit(row: ClientApi.Menu) {
  showAddModal.value = false;
  editingId.value = row.id;
  editingName.value = row.name;
  editingCode.value = row.code || '';
  editingOrder.value = row.order || 999;
}

// 取消编辑
function handleCancelEdit() {
  editingId.value = null;
  editingName.value = '';
  editingCode.value = '';
  editingOrder.value = 999;
}

// 保存编辑
async function handleSaveEdit(row: ClientApi.Menu) {
  if (!editingName.value.trim()) {
    message.warning('请输入按钮名称');
    return;
  }
  if (!editingCode.value.trim()) {
    message.warning('请输入按钮编码');
    return;
  }
  
  updatingButton.value = true;
  try {
    await updateClientMenuApi(row.id, {
      name: editingName.value.trim(),
      code: editingCode.value.trim(),
      order: editingOrder.value,
    });
    message.success('更新成功');
    editingId.value = null;
    await loadButtons();
    emit('refresh');
  } catch (error) {
    // Error already handled by interceptor
  } finally {
    updatingButton.value = false;
  }
}

// 新增按钮
async function handleAddButton() {
  // 先验证表单
  try {
    await formRef.value?.validate();
  } catch (error) {
    // 验证失败，不关闭弹窗
    return false;
  }
  
  addingButton.value = true;
  try {
    await createClientMenuApi({
      name: newButtonName.value.trim(),
      code: newButtonCode.value.trim(),
      type: 'BUTTON',
      parentId: props.menuId!,
      order: newButtonOrder.value,
      enable: true,
      hidden: false,
      moduleCode: '', // 按钮不需要 moduleCode，会从父菜单继承
    });
    message.success('新增成功');
    showAddModal.value = false;
    resetForm();
    await loadButtons();
    emit('refresh');
    return true;
  } catch (error) {
    // 保存失败，不关闭弹窗
    return false;
  } finally {
    addingButton.value = false;
  }
}

// 删除按钮
async function handleDelete(row: ClientApi.Menu) {
  try {
    await deleteClientMenuApi(row.id);
    message.success('删除成功');
    await loadButtons();
    emit('refresh');
  } catch (error) {
    // Error already handled by interceptor
  }
}

// 刷新列表
function handleRefresh() {
  loadButtons();
}

// 关闭抽屉
function handleClose() {
  emit('update:show', false);
}

// 表格列定义
const columns: DataTableColumns<ClientApi.Menu> = [
  {
    title: '名称',
    key: 'name',
    width: 180,
    ellipsis: { tooltip: true },
    render: (row) => {
      if (editingId.value === row.id) {
        return h(NInput, {
          value: editingName.value,
          'onUpdate:value': (val: string) => { editingName.value = val; },
          placeholder: '请输入名称',
          size: 'small',
        });
      }
      return row.name;
    },
  },
  {
    title: '编码',
    key: 'code',
    minWidth: 200,
    ellipsis: { tooltip: true },
    render: (row) => {
      if (editingId.value === row.id) {
        return h(NInput, {
          value: editingCode.value,
          'onUpdate:value': (val: string) => { editingCode.value = val; },
          placeholder: '请输入编码',
          size: 'small',
        });
      }
      return h(
        'code',
        {
          class: 'px-2 py-1 rounded bg-muted/50 text-sm font-mono text-primary',
        },
        row.code || '-'
      );
    },
  },
  {
    title: '排序',
    key: 'order',
    width: 120,
    align: 'center',
    render: (row) => {
      if (editingId.value === row.id) {
        return h(NInputNumber, {
          value: editingOrder.value,
          'onUpdate:value': (val: number | null) => { editingOrder.value = val || 999; },
          min: 0,
          max: 9999,
          size: 'small',
          style: { width: '100%' },
        });
      }
      return h(
        'span',
        {
          class: 'px-2 py-1 rounded-full bg-muted text-sm',
        },
        row.order
      );
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    align: 'center',
    render: (row) => {
      if (editingId.value === row.id) {
        return h('div', { class: 'flex items-center justify-center gap-2' }, [
          h(
            NButton,
            {
              text: true,
              type: 'primary',
              size: 'small',
              loading: updatingButton.value,
              onClick: () => handleSaveEdit(row),
            },
            { default: () => '保存' }
          ),
          h(
            NButton,
            {
              text: true,
              size: 'small',
              onClick: handleCancelEdit,
            },
            { default: () => '取消' }
          ),
        ]);
      }
      return h('div', { class: 'flex items-center justify-center gap-2' }, [
        h(
          NButton,
          {
            text: true,
            type: 'primary',
            size: 'small',
            onClick: () => handleEdit(row),
          },
          { default: () => '编辑' }
        ),
        h(
          NButton,
          {
            text: true,
            type: 'error',
            size: 'small',
            onClick: () => handleDelete(row),
          },
          { default: () => '删除' }
        ),
      ]);
    },
  },
];
</script>

<template>
  <NDrawer
    :show="show"
    :width="800"
    placement="right"
    @update:show="handleClose"
  >
    <!-- 标题栏 -->
    <div class="px-6 py-4 border-b border-border bg-background">
      <div class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        <span class="text-base font-medium">{{ menuName }}</span>
      </div>
    </div>

    <div class="flex flex-col h-full">
      <!-- 操作栏 -->
      <div class="px-6 py-4 flex items-center justify-between border-b border-border">
        <NButton
          type="primary"
          @click="handleShowAddModal"
        >
          <template #icon>
            <span class="text-base">+</span>
          </template>
          新增按钮
        </NButton>
        <NButton
          quaternary
          circle
          @click="handleRefresh"
        >
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </template>
        </NButton>
      </div>

      <!-- 统计信息 -->
      <div v-if="buttons.length > 0" class="px-6 py-3 text-sm text-muted-foreground border-b border-border bg-muted/30">
        共 <span class="text-primary font-medium">{{ buttons.length }}</span> 个按钮权限
      </div>

      <!-- 列表 -->
      <div class="flex-1 min-h-0 overflow-auto">
        <NSpin :show="loading">
          <div v-if="buttons.length > 0" class="px-6 py-4">
            <NDataTable
              :columns="columns"
              :data="buttons"
              :bordered="false"
              :single-line="false"
            />
          </div>
          <div v-else class="flex flex-col items-center justify-center py-20">
            <div class="mb-4 text-6xl opacity-20">📋</div>
            <div class="text-base text-muted-foreground mb-2">暂无按钮权限</div>
            <div class="text-sm text-muted-foreground/60 mb-6">
              点击上方"新增按钮"添加第一个按钮权限
            </div>
            <NButton
              type="primary"
              ghost
              @click="handleShowAddModal"
            >
              立即添加
            </NButton>
          </div>
        </NSpin>
      </div>
    </div>

    <!-- 新增按钮弹窗 -->
    <NModal
      v-model:show="showAddModal"
      preset="dialog"
      :title="'新增按钮'"
      :positive-text="'确定'"
      :negative-text="'取消'"
      :loading="addingButton"
      :style="{ width: '540px' }"
      @positive-click="handleAddButton"
      @negative-click="handleCancelAdd"
    >
      <div class="py-4">
        <NForm
          ref="formRef"
          :model="{ name: newButtonName, code: newButtonCode, order: newButtonOrder }"
          :rules="formRules"
          label-placement="left"
          label-width="auto"
          require-mark-placement="left"
        >
          <NFormItem label="名称" path="name">
            <NInput
              v-model:value="newButtonName"
              placeholder="请输入按钮名称，如：新增、编辑、删除"
              clearable
              size="large"
              @keyup.enter="handleAddButton"
            />
          </NFormItem>
          <NFormItem label="编码" path="code" class="mt-2">
            <NInput
              v-model:value="newButtonCode"
              placeholder="请输入按钮编码，如：client:create"
              clearable
              size="large"
              @keyup.enter="handleAddButton"
            />
          </NFormItem>
          <NFormItem label="排序" path="order" class="mt-2">
            <NInputNumber
              v-model:value="newButtonOrder"
              :min="0"
              :max="9999"
              placeholder="请输入排序值"
              size="large"
              style="width: 100%"
              @keyup.enter="handleAddButton"
            />
          </NFormItem>
        </NForm>
      </div>
    </NModal>
  </NDrawer>
</template>
