<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui';

import type { CrawlerApi } from '#/api/modules/crawler';

import { computed, h } from 'vue';

import { NButton, NDataTable, NSpace, NTag } from 'naive-ui';

interface Props {
  data: (CrawlerApi.CrawlResult & { taskName?: string })[];
  loading?: boolean;
  enrichStatusMap?: Record<string, string>;
  showTaskName?: boolean;
}

interface Emits {
  (e: 'preview', row: CrawlerApi.CrawlResult): void;
  (e: 'enrich', row: CrawlerApi.CrawlResult): void;
  (e: 'viewEnrich', row: CrawlerApi.CrawlResult): void;
  (e: 'deleteResult', row: CrawlerApi.CrawlResult): void;
  (e: 'deleteEnrich', row: CrawlerApi.CrawlResult): void;
  (e: 'stopEnrich', row: CrawlerApi.CrawlResult): void;
  (e: 'clearStatus', row: CrawlerApi.CrawlResult): void;
}

defineOptions({ name: 'ResultTable' });

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  enrichStatusMap: () => ({}),
  showTaskName: false,
});

const emit = defineEmits<Emits>();

const enrichTagMap: Record<string, { label: string; type: 'default' | 'error' | 'info' | 'success' | 'warning' }> = {
  success: { label: '已增强', type: 'success' },
  processing: { label: '处理中', type: 'info' },
  pending: { label: '待处理', type: 'default' },
  failed: { label: '增强失败', type: 'error' },
};

const columns = computed(
  (): DataTableColumns<CrawlerApi.CrawlResult & { taskName?: string }> => {
    const cols: DataTableColumns<CrawlerApi.CrawlResult & { taskName?: string }> = [
      {
        title: 'URL',
        key: 'url',
        minWidth: 250,
        ellipsis: { tooltip: true },
      },
    ];

    if (props.showTaskName) {
      cols.push({
        title: '任务名称',
        key: 'taskName',
        width: 140,
        ellipsis: { tooltip: true },
        render: (row) =>
          (row as any).taskName
            ? (row as any).taskName
            : h('span', { class: 'text-muted-foreground' }, '-'),
      });
    }

    cols.push(
      {
        title: '标题',
        key: 'title',
        minWidth: 160,
        render: (row) =>
          row.title ?? h('span', { class: 'text-muted-foreground' }, '-'),
      },
      {
        title: '状态',
        key: 'status',
        width: 90,
        render: (row) =>
          h(
            NTag,
            {
              type: row.status === 'success' ? 'success' : 'error',
              size: 'small',
            },
            { default: () => (row.status === 'success' ? '成功' : '失败') },
          ),
      },
      {
        title: 'AI 增强',
        key: 'enrichStatus',
        width: 100,
        render: (row) => {
          const status = props.enrichStatusMap[row.id];
          if (!status) {
            return h('span', { class: 'text-muted-foreground text-xs' }, '-');
          }
          const tag = enrichTagMap[status] ?? { label: status, type: 'default' as const };
          return h(NTag, { type: tag.type, size: 'small' }, { default: () => tag.label });
        },
      },
      {
        title: '耗时',
        key: 'elapsedMs',
        width: 100,
        render: (row) => {
          if (row.elapsedMs === null || row.elapsedMs === undefined) {
            return h('span', { class: 'text-muted-foreground' }, '-');
          }
          const seconds = (row.elapsedMs / 1000).toFixed(1);
          return `${seconds}s`;
        },
      },
      {
        title: '爬取时间',
        key: 'createdAt',
        width: 180,
        render: (row) => new Date(row.createdAt).toLocaleString('zh-CN'),
      },
      {
        title: '错误信息',
        key: 'errorMsg',
        minWidth: 200,
        ellipsis: { tooltip: true },
        render: (row) =>
          row.errorMsg
            ? h('span', { style: 'color: var(--error-color)' }, row.errorMsg)
            : h('span', { class: 'text-muted-foreground' }, '-'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 280,
        fixed: 'right',
        render: (row) => {
          const enrichStatus = props.enrichStatusMap[row.id];
          const buttons: any[] = [
            h(
              NButton,
              {
                size: 'tiny',
                type: 'primary',
                quaternary: true,
                onClick: () => emit('preview', row),
              },
              { default: () => '原始数据' },
            ),
          ];

          if (enrichStatus === 'success') {
            buttons.push(
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'success',
                  quaternary: true,
                  onClick: () => emit('viewEnrich', row),
                },
                { default: () => '增强结果' },
              ),
            );
          } else if (enrichStatus === 'processing') {
            buttons.push(
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'error',
                  quaternary: true,
                  onClick: () => emit('stopEnrich', row),
                },
                { default: () => '停止增强' },
              ),
            );
          } else if (enrichStatus === 'failed') {
            // 失败状态显示"清理状态"和"重新增强"
            buttons.push(
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'info',
                  quaternary: true,
                  onClick: () => emit('clearStatus', row),
                },
                { default: () => '清理状态' },
              ),
            );
            buttons.push(
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'warning',
                  quaternary: true,
                  onClick: () => emit('enrich', row),
                },
                { default: () => '重新增强' },
              ),
            );
          } else if (row.status === 'success') {
            buttons.push(
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'warning',
                  quaternary: true,
                  onClick: () => emit('enrich', row),
                },
                { default: () => 'AI 增强' },
              ),
            );
          }

          if (enrichStatus && enrichStatus !== 'processing') {
            buttons.push(
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'error',
                  quaternary: true,
                  onClick: () => emit('deleteEnrich', row),
                },
                { default: () => '删除增强' },
              ),
            );
          }

          buttons.push(
            h(
              NButton,
              {
                size: 'tiny',
                type: 'error',
                quaternary: true,
                onClick: () => emit('deleteResult', row),
              },
              { default: () => '删除' },
            ),
          );

          return h(NSpace, { size: 4 }, { default: () => buttons });
        },
      },
    );

    return cols;
  },
);
</script>

<template>
  <NDataTable
    remote
    striped
    :loading="loading"
    :columns="columns"
    :data="data"
    :pagination="false"
    :row-key="(row: CrawlerApi.CrawlResult) => row.id"
    :scroll-x="1300"
  />
</template>
