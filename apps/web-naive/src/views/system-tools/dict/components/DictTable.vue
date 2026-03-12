<script lang="ts" setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NDataTable, NInput, NPagination, NSpace, NTag } from 'naive-ui';
import { useDebounceFn } from '@vueuse/core';
import { dialog, message } from '#/adapter/naive';
import { deleteDictApi, getDictListApi } from '#/api/modules/dict';
import type { DictApi } from '#/api/modules/dict';

defineOptions({ name: 'DictTable' });

interface Emits {
  (e: 'select', dict: DictApi.Dict): void;
  (e: 'refresh'): void;
  (e: 'create'): void;
  (e: 'edit', dict: DictApi.Dict): void;
}

const emit = defineEmits<Emits>();

// 状态管理
const loading = ref(false);
const dataSource = ref<DictApi.Dict[]>([]);
const keyword = ref('');
const selectedRowKey = ref<number | null>(null);

// 分页状态
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
});

// 表格列定义
const columns = computed((): DataTableColumns<DictApi.Dict> => [
  { title: 'ID', key: 'id', width: 80 },
  { title: '编码', key: 'code', minWidth: 160 },
  { title: '名称', key: 'name', minWidth: 160 },
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
                onClick: () => handleDelete(row.id, row.name),
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
  loading.value = true;
  try {
    const result = await getDictListApi({
      pageNo: pagination.page,
      pageSize: pagination.pageSize,
      keyword: keyword.value || undefined,
    });
    dataSource.value = result.pageData;
    pagination.total = result.total;
  } catch (error) {
    // 错误已被拦截器处理
    console.error('Failed to fetch dict list:', error);
  } finally {
    loading.value = false;
  }
}

// 搜索处理（防抖 300ms）
const handleSearch = useDebounceFn(() => {
  pagination.page = 1; // 搜索时重置到第一页
  fetchData();
}, 300);

// 分页变化处理
function handlePageChange(page: number) {
  pagination.page = page;
  fetchData();
}

// 每页数量变化处理
function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize;
  pagination.page = 1; // 改变每页数量时重置到第一页
  fetchData();
}

// 行点击处理
function handleRowClick(row: DictApi.Dict) {
  selectedRowKey.value = row.id;
  emit('select', row);
}

// 行属性
function rowProps(row: DictApi.Dict) {
  return {
    style: {
      cursor: 'pointer',
    },
    onClick: () => handleRowClick(row),
  };
}

// 创建处理
function handleCreate() {
  emit('create');
}

// 编辑处理
function handleEdit(dict: DictApi.Dict) {
  emit('edit', dict);
}

// 删除处理
function handleDelete(id: number, name: string) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除字典「${name}」吗？此操作将同时删除所有字典项，且不可恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteDictApi(id);
        message.success('删除成功');
        await fetchData();
        // 如果删除的是当前选中的字典，清除选中状态
        if (selectedRowKey.value === id) {
          selectedRowKey.value = null;
          emit('refresh');
        }
      } catch (error) {
        // 错误已被拦截器处理
        console.error('Failed to delete dict:', error);
      }
    },
  });
}

// 组件挂载时获取数据
onMounted(() => {
  fetchData();
});

// 暴露刷新方法供父组件调用
defineExpose({ fetchData });
</script>

<template>
  <div>
    <!-- 搜索栏和操作按钮 -->
    <div class="mb-3 flex justify-between">
      <NSpace>
        <NInput
          v-model:value="keyword"
          placeholder="搜索字典名称或编码"
          clearable
          style="width: 240px"
          @update:value="handleSearch"
        />
      </NSpace>

      <NSpace>
        <NButton type="primary" @click="handleCreate">新增字典</NButton>
      </NSpace>
    </div>

    <!-- 数据表格 -->
    <NDataTable
      :columns="columns"
      :data="dataSource"
      :loading="loading"
      :row-key="(row: DictApi.Dict) => row.id"
      :row-props="rowProps"
      :row-class-name="
        (row: DictApi.Dict) =>
          selectedRowKey === row.id ? 'selected-row' : ''
      "
      striped
    />

    <!-- 分页 -->
    <div class="mt-3 flex justify-end">
      <NPagination
        v-model:page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :item-count="pagination.total"
        :page-sizes="pagination.pageSizes"
        :show-size-picker="pagination.showSizePicker"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </div>
  </div>
</template>

<style scoped>
:deep(.selected-row) {
  background-color: var(--n-td-color-hover) !important;
}
</style>
