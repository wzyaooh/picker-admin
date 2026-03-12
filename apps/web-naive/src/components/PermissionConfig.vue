<script setup lang="ts">
/**
 * 权限配置组件
 *
 * 提供权限树选择弹窗，用于为角色分配权限。
 * 支持树形结构展示、级联选择、默认展开等功能。
 *
 * @example
 * <PermissionConfig
 *   v-model:show="visible"
 *   title="分配权限"
 *   :selected-permission-ids="[1, 2, 3]"
 *   @submit="handleSubmit"
 * />
 */
import type { TreeOption } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { NButton, NModal, NTree, NSpin } from 'naive-ui';
import { getPermissionTreeApi } from '#/api';

/**
 * 组件 Props
 */
interface Props {
  /** 弹窗标题 */
  title?: string;
  /** 初始选中的权限ID列表 */
  selectedPermissionIds?: number[];
}

const props = defineProps<Props>();

/**
 * 组件 Emits
 */
const emit = defineEmits<{
  /** 提交选中的权限ID列表 */
  submit: [permissionIds: number[]];
}>();

/** 控制弹窗显示/隐藏 */
const show = defineModel<boolean>('show', { required: true });

/** 加载状态 */
const loading = ref(false);

/** 权限树数据 */
const permissionTree = ref<any[]>([]);

/** 选中的权限ID列表 */
const checkedKeys = ref<number[]>([]);

/** 弹窗标题（带默认值） */
const titleValue = computed(() => props.title ?? '配置权限');

/** 初始选中的权限ID列表（带默认值） */
const selectedIds = computed(() => props.selectedPermissionIds ?? []);

/**
 * 获取权限树数据
 */
async function fetchPermissionTree() {
  loading.value = true;
  try {
    const tree = await getPermissionTreeApi();
    permissionTree.value = transformPermissionTree(tree);
  } catch (error) {
    console.error('Failed to fetch permission tree:', error);
  } finally {
    loading.value = false;
  }
}

/**
 * 转换权限树数据格式
 */
function transformPermissionTree(permissions: any[]): TreeOption[] {
  return permissions.map((perm) => ({
    key: perm.id,
    label: perm.name,
    children:
      perm.children && perm.children.length > 0
        ? transformPermissionTree(perm.children)
        : undefined,
  }));
}

/**
 * 监听弹窗显示状态
 */
watch(
  () => show.value,
  (val) => {
    if (val) {
      fetchPermissionTree();
      checkedKeys.value = [...selectedIds.value];
    }
  },
);

/**
 * 处理提交操作
 */
function handleSubmit() {
  emit('submit', checkedKeys.value);
  show.value = false;
}

onMounted(() => {
  if (show.value) {
    fetchPermissionTree();
  }
});
</script>

<template>
  <NModal v-model:show="show" preset="card" :title="titleValue" class="w-[600px]">
    <NSpin :show="loading">
      <div class="max-h-[500px] overflow-auto">
        <NTree
          v-model:checked-keys="checkedKeys"
          :data="permissionTree"
          checkable
          cascade
          block-line
          expand-on-click
          default-expand-all
        />
      </div>
    </NSpin>

    <template #footer>
      <div class="flex justify-end gap-3">
        <NButton @click="show = false">取消</NButton>
        <NButton type="primary" @click="handleSubmit">保存</NButton>
      </div>
    </template>
  </NModal>
</template>
