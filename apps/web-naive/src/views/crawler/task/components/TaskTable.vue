<script lang="ts" setup>
/**
 * 爬虫任务列表表格组件
 *
 * 展示爬虫任务列表，包含名称、爬虫类型、目标 URL、Cron、状态、最后执行时间、操作列。
 * 顶部搜索栏支持关键词搜索和新增任务按钮。
 */

import type { DataTableColumns } from 'naive-ui';

import type { CrawlerApi } from '#/api/modules/crawler';

import { computed, h, ref } from 'vue';

import { NButton, NDataTable, NInput, NSpace, NTag } from 'naive-ui';

defineOptions({ name: 'TaskTable' });

withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

interface Props {
  data: CrawlerApi.CrawlTask[];
  loading?: boolean;
}

interface Emits {
  (e: 'create'): void;
  (e: 'edit', row: CrawlerApi.CrawlTask): void;
  (e: 'run', row: CrawlerApi.CrawlTask): void;
  (e: 'stop', row: CrawlerApi.CrawlTask): void;
  (e: 'viewResults', row: CrawlerApi.CrawlTask): void;
  (e: 'clearDedup', row: CrawlerApi.CrawlTask): void;
  (e: 'delete', row: CrawlerApi.CrawlTask): void;
  (e: 'search', keyword: string): void;
  (e: 'refresh'): void;
}

const keyword = ref('');

const statusMap: Record<
  string,
  { label: string; type: 'default' | 'error' | 'info' | 'warning' }
> = {
  idle: { label: '空闲', type: 'default' },
  running: { label: '运行中', type: 'info' },
  error: { label: '错误', type: 'error' },
  cancelled: { label: '已取消', type: 'warning' },
};

const columns = computed(
  (): DataTableColumns<CrawlerApi.CrawlTask> => [
    {
      title: '名称',
      key: 'name',
      minWidth: 140,
    },
    {
      title: '爬虫类型',
      key: 'spiderName',
      width: 130,
    },
    {
      title: '目标 URL',
      key: 'targetUrl',
      minWidth: 200,
      ellipsis: { tooltip: true },
    },
    {
      title: 'Cron',
      key: 'cronExpr',
      width: 140,
      render: (row) =>
        row.cronExpr
          ? h('span', {}, row.cronExpr)
          : h('span', { class: 'text-muted-foreground' }, '-'),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (row) => {
        const info = statusMap[row.status] ?? {
          label: row.status,
          type: 'default' as const,
        };
        return h(
          NTag,
          { type: info.type, size: 'small' },
          { default: () => info.label },
        );
      },
    },
    {
      title: '最后执行',
      key: 'lastRunAt',
      width: 180,
      render: (row) =>
        row.lastRunAt
          ? new Date(row.lastRunAt).toLocaleString('zh-CN')
          : h('span', { class: 'text-muted-foreground' }, '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      fixed: 'right',
      render: (row) =>
        h(
          NSpace,
          { size: 4 },
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
              row.status === 'running'
                ? h(
                    NButton,
                    {
                      size: 'tiny',
                      tertiary: true,
                      type: 'warning',
                      onClick: () => emit('stop', row),
                    },
                    { default: () => '停止' },
                  )
                : h(
                    NButton,
                    {
                      size: 'tiny',
                      tertiary: true,
                      type: 'success',
                      onClick: () => emit('run', row),
                    },
                    { default: () => '执行' },
                  ),
              h(
                NButton,
                {
                  size: 'tiny',
                  tertiary: true,
                  type: 'info',
                  onClick: () => emit('viewResults', row),
                },
                { default: () => '结果' },
              ),
              h(
                NButton,
                {
                  size: 'tiny',
                  tertiary: true,
                  onClick: () => emit('clearDedup', row),
                },
                { default: () => '去重' },
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
        ),
    },
  ],
);
</script>

<template>
  <div>
    <div class="mb-3 flex items-center justify-between">
      <NSpace>
        <NInput
          v-model:value="keyword"
          placeholder="搜索任务名称"
          clearable
          style="width: 240px"
          @clear="emit('search', '')"
          @keyup.enter="emit('search', keyword)"
        />
        <NButton type="primary" @click="emit('search', keyword)">
          查询
        </NButton>
        <NButton @click="emit('refresh')">
          刷新
        </NButton>
      </NSpace>
      <NButton type="primary" @click="emit('create')">新增任务</NButton>
    </div>

    <NDataTable
      remote
      striped
      :loading="loading"
      :columns="columns"
      :data="data"
      :pagination="false"
      :row-key="(row: CrawlerApi.CrawlTask) => row.id"
      :scroll-x="1200"
    />
  </div>
</template>
