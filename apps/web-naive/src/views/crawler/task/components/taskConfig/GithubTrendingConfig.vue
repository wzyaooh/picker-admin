<script setup lang="ts">
import type { SelectOption } from 'naive-ui';
import { computed } from 'vue';
import {
  NDynamicTags,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSwitch,
} from 'naive-ui';

interface TrendingConfig {
  keywords: string[];
  language: string;
  sort: string;
  minStars: number;
  maxPages: number;
  perPage: number;
  fetchReadme: boolean;
  fetchReadmeLimit: number;
  fetchVersion: boolean;
  token: string;
}

defineProps<{
  config: TrendingConfig;
}>();

defineEmits<{
  (e: 'update:config', config: TrendingConfig): void;
}>();

const config = defineModel<TrendingConfig>('config', { required: true });

const estimatedSearchCalls = computed(() => {
  const kwCount = Math.max(config.value.keywords.length, 1);
  return kwCount * config.value.maxPages;
});

const hasTokenHint = computed(() => {
  // 编辑模式下无法确定是否有 token，保守估计
  return false;
});

const sortOptions: SelectOption[] = [
  { label: 'Stars（最多星标）', value: 'stars' },
  { label: 'Forks（最多 Fork）', value: 'forks' },
  { label: 'Updated（最近更新）', value: 'updated' },
  { label: 'Best Match（最佳匹配）', value: 'best-match' },
];
</script>

<template>
  <div>
    <NFormItem label="GitHub Token">
      <NInput
        v-model:value="config.token"
        placeholder="可选，提高 API 速率限制（30/min vs 10/min）"
        type="password"
        show-password-on="click"
      />
    </NFormItem>

    <NFormItem label="搜索关键词">
      <div class="w-full">
        <NDynamicTags v-model:value="config.keywords" />
        <div class="mt-1 text-xs text-gray-400">
          输入关键词后按回车添加，支持多个关键词独立搜索并合并去重
        </div>
      </div>
    </NFormItem>

    <NFormItem label="编程语言">
      <NInput
        v-model:value="config.language"
        placeholder="可选，如 Python、TypeScript、Go"
      />
    </NFormItem>

    <NFormItem label="排序方式">
      <NSelect
        v-model:value="config.sort"
        :options="sortOptions"
      />
    </NFormItem>

    <NFormItem label="最低 Stars">
      <NInputNumber
        v-model:value="config.minStars"
        :min="0"
        :step="50"
        class="w-full"
      />
    </NFormItem>

    <NFormItem label="搜索页数">
      <div class="w-full">
        <NInputNumber
          v-model:value="config.maxPages"
          :min="1"
          :max="34"
          class="w-full"
        />
        <div
          v-if="estimatedSearchCalls > 20"
          class="mt-1 text-xs text-orange-500"
        >
          ⚠️ 预估 {{ estimatedSearchCalls }} 次搜索请求（{{ config.keywords.length || 1 }} 关键词 × {{ config.maxPages }} 页），GitHub Search API 限制 {{ hasTokenHint ? 30 : 10 }}/分钟，爬虫会自动限流等待
        </div>
      </div>
    </NFormItem>

    <NFormItem label="每页数量">
      <NInputNumber
        v-model:value="config.perPage"
        :min="10"
        :max="100"
        :step="10"
        class="w-full"
      />
    </NFormItem>

    <NFormItem label="抓取 README">
      <NSwitch v-model:value="config.fetchReadme" />
    </NFormItem>

    <NFormItem v-if="config.fetchReadme" label="README 数量">
      <div class="w-full">
        <NInputNumber
          v-model:value="config.fetchReadmeLimit"
          :min="1"
          :max="200"
          class="w-full"
        />
        <div class="mt-1 text-xs text-gray-400">
          限制抓取 README 的仓库数量，每个消耗 1 次 API 调用
        </div>
      </div>
    </NFormItem>

    <NFormItem label="抓取版本号">
      <NSwitch v-model:value="config.fetchVersion" />
    </NFormItem>
  </div>
</template>
