<script lang="ts" setup>
import { computed, h, ref, watch } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NDataTable, NEmpty, NSpace, NTag } from 'naive-ui';
import { dialog, message } from '#/adapter/naive';
import { deleteDictItemApi, getDictItemsApi } from '#/api/modules/dict';
import type { DictApi } from '#/api/modules/dict';

defineOptions({ name: 'DictItemTable' });

interface Props {
  dictId: number | null;
  dictCode: string;
}

interface Emits {
  (e: 'create'): void;
  (e: 'edit', item: DictApi.DictItem): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 状态管理
const loading = ref(false);
const dataSource = ref<DictApi.DictItem[]>([]);

// 表格列定义
const columns = computed((): DataTableColumns<DictApi.DictItem> => [
  { title: 'ID', key: 'id', width: 80 },
  { title: '标签', key: 'label', minWidth: 120 },
  { title: '值', key: 'value', minWidth: 120 },
  {
    title: '颜色',
    key: 'color',
    width: 120,
    render: (row) =>
      row.color
        ? h(
            NTag,
            { type: row.color as any },
            { default: () => row.color },
          )
        : h('span', { style: { color: '#999' } }, '-'),
  },
  {
    title: '排序',
    key: 'sort',
    width: 90,
    align: 'center',
  },
  {
    title: '状态',
    key: 'enable',
    width: 90,
    render: (row) =>
      h(
        NTag,
        { type: row.enable ? 'success' : 'default' },
        { default: () => (row.enable ? '启用' : '禁用') },
      ),
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render: (row) =>
      h(
        NSpace,
        { size: 8 },
        {
          default: () => [
            h(
              NButton,
              {
                size: 'tiny',
                type: 'primary',
                onClick: () => handleEdit(row),
              },
              { default: () => '编辑' },
            ),
            h(
              NButton,
              {
                size: 'tiny',
                type: 'error',
                onClick: () => handleDelete(row.id, row.label),
              },
              { default: () => '删除' },
            ),
          ],
        },
      ),
  },
]);

// 数据获取
async function fetchData() {
  if (!props.dictId) {
    dataSource.value = [];
    return;
  }

  loading.value = true;
  try {
    const result = await getDictItemsApi(props.dictId);
    dataSource.value = result;
  } catch (error) {
    // 错误已被拦截器处理
    console.error('Failed to fetch dict items:', error);
    dataSource.value = [];
  } finally {
    loading.value = false;
  }
}

// 监听 dictId 变化，自动加载数据
watch(
  () => props.dictId,
  () => {
    fetchData();
  },
  { immediate: true },
);

// 创建处理
function handleCreate() {
  if (!props.dictId) {
    message.warning('请先选择一个字典');
    return;
  }
  emit('create');
}

// 编辑处理
function handleEdit(item: DictApi.DictItem) {
  emit('edit', item);
}

// 删除处理
function handleDelete(itemId: number, label: string) {
  if (!props.dictId) {
    message.warning('请先选择一个字典');
    return;
  }

  dialog.warning({
    title: '确认删除',
    content: `确定删除字典项「${label}」吗？此操作不可恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteDictItemApi(props.dictId!, itemId);
        message.success('删除成功');
        await fetchData();
      } catch (error) {
        // 错误已被拦截器处理
        console.error('Failed to delete dict item:', error);
      }
    },
  });
}

// 暴露刷新方法供父组件调用
defineExpose({ fetchData });
</script>

<template>
  <div>
    <!-- 操作按钮 -->
    <div class="mb-3 flex justify-end">
      <NSpace>
        <NButton
          type="primary"
          :disabled="!dictId"
          @click="handleCreate"
        >
          新增字典项
        </NButton>
      </NSpace>
    </div>

    <!-- 数据表格 -->
    <NDataTable
      v-if="dictId"
      :columns="columns"
      :data="dataSource"
      :loading="loading"
      :row-key="(row: DictApi.DictItem) => row.id"
      striped
    />

    <!-- 空状态提示 -->
    <div v-else class="flex items-center justify-center" style="height: 400px">
      <NEmpty description="请从左侧选择一个字典" />
    </div>
  </div>
</template>
