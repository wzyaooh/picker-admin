<script lang="ts" setup>
import { NCard, NGrid, NGridItem, NSpin, NStatistic } from 'naive-ui';

import type { CrawlerApi } from '#/api/modules/crawler';

defineOptions({ name: 'StatsCards' });

interface Props {
  stats: CrawlerApi.GlobalStats | null;
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
});

const cards = [
  { key: 'totalTasks', label: '总任务数', icon: '📋', color: '' },
  { key: 'runningTasks', label: '运行中', icon: '▶️', color: 'text-blue-500' },
  { key: 'totalSuccess', label: '成功次数', icon: '✅', color: 'text-green-500' },
  { key: 'totalFails', label: '失败次数', icon: '❌', color: 'text-red-500' },
] as const;
</script>

<template>
  <NSpin :show="loading">
    <NGrid :cols="4" :x-gap="16" :y-gap="16">
      <NGridItem v-for="card in cards" :key="card.key">
        <NCard :bordered="false" size="small">
          <NStatistic :label="card.label" :value="stats?.[card.key] ?? 0">
            <template #prefix>
              <span class="text-2xl" :class="card.color">{{ card.icon }}</span>
            </template>
          </NStatistic>
        </NCard>
      </NGridItem>
    </NGrid>
  </NSpin>
</template>
