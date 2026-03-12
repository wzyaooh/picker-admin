<script lang="ts" setup>
import type { CrawlerApi } from '#/api/modules/crawler';
import type { DataTableColumns } from 'naive-ui';

import { computed, h, onMounted, ref } from 'vue';

import {
  NButton,
  NCard,
  NDataTable,
  NInput,
  NPagination,
  NSpace,
  NTag,
} from 'naive-ui';

import { dialog, message } from '#/adapter/naive';
import { deleteArticleApi, listArticlesApi } from '#/api/modules/crawler';

import ArticleDrawer from './components/ArticleDrawer.vue';

defineOptions({ name: 'CrawlerArticlePage' });

const loading = ref(false);
const keyword = ref('');
const dataSource = ref<CrawlerApi.GeneratedArticleListItem[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

// 文章详情抽屉
const drawerShow = ref(false);
const currentArticleId = ref('');

async function fetchData() {
  loading.value = true;
  try {
    const result = await listArticlesApi({
      pageNo: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    });
    dataSource.value = result.pageData;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  fetchData();
}

function handlePageChange(p: number) {
  page.value = p;
  fetchData();
}

function handleView(row: CrawlerApi.GeneratedArticleListItem) {
  currentArticleId.value = row.id;
  drawerShow.value = true;
}

function handleDelete(row: CrawlerApi.GeneratedArticleListItem) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除文章「${row.title}」吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteArticleApi(row.id);
        message.success('删除成功');
        await fetchData();
      } catch {}
    },
  });
}

const columns = computed((): DataTableColumns<CrawlerApi.GeneratedArticleListItem> => [
  {
    title: '项目',
    key: 'projectName',
    minWidth: 160,
    render: (row) =>
      h('div', {}, [
        h('div', { class: 'font-medium text-sm' }, row.title || row.projectName || '-'),
        row.projectName && row.title !== row.projectName
          ? h('div', { class: 'text-xs text-gray-400 mt-0.5' }, row.projectName)
          : null,
      ]),
  },
  {
    title: '分类',
    key: 'category',
    width: 120,
    render: (row) =>
      row.category
        ? h(NTag, { size: 'small', type: 'info', bordered: false }, { default: () => row.category })
        : h('span', { class: 'text-gray-400' }, '-'),
  },
  {
    title: '类型',
    key: 'articleType',
    width: 100,
    render: (row) => {
      const map: Record<string, { label: string; type: 'default' | 'info' | 'success' | 'warning' }> = {
        analysis: { label: '深度解析', type: 'info' },
        tutorial: { label: '实践教程', type: 'success' },
      };
      const info = map[row.articleType] || { label: row.articleType || '解析', type: 'default' as const };
      return h(NTag, { size: 'small', type: info.type, bordered: false }, { default: () => info.label });
    },
  },
  {
    title: '标签',
    key: 'tags',
    width: 200,
    render: (row) =>
      row.tags?.length
        ? h(NSpace, { size: 4 }, {
            default: () =>
              row.tags.slice(0, 3).map((tag) =>
                h(NTag, { size: 'tiny', bordered: false, round: true }, { default: () => tag }),
              ),
          })
        : h('span', { class: 'text-gray-400' }, '-'),
  },
  {
    title: '字数',
    key: 'wordCount',
    width: 80,
    render: (row) =>
      h('span', { class: 'text-xs' }, row.wordCount ? `${row.wordCount.toLocaleString()}` : '-'),
  },
  {
    title: 'Tokens',
    key: 'tokensUsed',
    width: 90,
    render: (row) =>
      h('span', { class: 'text-xs text-gray-500' }, row.tokensUsed ? row.tokensUsed.toLocaleString() : '-'),
  },
  {
    title: '生成时间',
    key: 'createdAt',
    width: 160,
    render: (row) =>
      h('span', { class: 'text-xs text-gray-500' }, row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { size: 'tiny', type: 'primary', onClick: () => handleView(row) }, { default: () => '查看' }),
          h(NButton, { size: 'tiny', type: 'error', onClick: () => handleDelete(row) }, { default: () => '删除' }),
        ],
      }),
  },
]);

onMounted(() => {
  // 移除自动调用爬虫接口，改为用户主动刷新时调用
  fetchData();
});
</script>

<template>
  <div class="p-4">
    <NCard title="AI 生成文章" :bordered="false">
      <div class="mb-3 flex items-center justify-between">
        <NSpace>
          <NInput
            v-model:value="keyword"
            placeholder="搜索项目名/标题/分类"
            clearable
            style="width: 260px"
            @keyup.enter="handleSearch"
          />
          <NButton type="primary" @click="handleSearch">查询</NButton>
        <NButton @click="fetchData">刷新</NButton>
        </NSpace>
        <span class="text-xs text-gray-400">共 {{ total }} 篇文章</span>
      </div>

      <NDataTable
        :columns="columns"
        :data="dataSource"
        :loading="loading"
        :row-key="(row: CrawlerApi.GeneratedArticleListItem) => row.id"
        striped
      />

      <div v-if="total > pageSize" class="mt-3 flex justify-end">
        <NPagination
          v-model:page="page"
          :item-count="total"
          :page-size="pageSize"
          @update:page="handlePageChange"
        />
      </div>
    </NCard>

    <ArticleDrawer
      v-model:show="drawerShow"
      :article-id="currentArticleId"
      @refresh-list="fetchData"
    />
  </div>
</template>
