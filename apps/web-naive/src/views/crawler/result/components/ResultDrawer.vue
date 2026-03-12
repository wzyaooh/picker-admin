<script lang="ts" setup>
import type { CrawlerApi } from '#/api/modules/crawler';

import { computed, ref } from 'vue';

import {
  NAvatar,
  NButton,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NScrollbar,
  NSpace,
  NTag,
} from 'naive-ui';
import { marked } from 'marked';

interface Props {
  show: boolean;
  result: CrawlerApi.CrawlResult | null;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
}

defineOptions({ name: 'ResultDrawer' });

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const rawData = computed(() => props.result?.rawData ?? {});
const owner = computed(() => rawData.value?.owner as Record<string, string> | undefined);
const topics = computed(() => (rawData.value?.topics as string[]) ?? []);

const readmeCollapsed = ref(true);

const renderedReadme = computed(() => {
  const readme = rawData.value?.readme as string | undefined;
  if (!readme) return '';
  return marked.parse(readme, { breaks: true }) as string;
});
</script>

<template>
  <NDrawer
    :show="show"
    :width="560"
    placement="right"
    @update:show="emit('update:show', $event)"
  >
    <NDrawerContent title="爬取结果详情" closable>
      <template v-if="result">
        <NScrollbar style="max-height: calc(100vh - 100px)">
          <!-- 基础信息 -->
          <div class="mb-4 flex items-center gap-3">
            <NAvatar
              v-if="rawData.logo"
              :src="rawData.logo as string"
              :size="48"
              round
            />
            <div>
              <div class="text-lg font-medium">
                {{ rawData.title || result.title || '-' }}
              </div>
              <div
                v-if="rawData.author"
                class="text-sm text-gray-500"
              >
                {{ rawData.author }}
              </div>
            </div>
          </div>

          <!-- 描述 -->
          <div
            v-if="rawData.description"
            class="mb-4 text-sm text-gray-600"
          >
            {{ rawData.description }}
          </div>

          <!-- 统计标签 -->
          <NSpace class="mb-4" :size="8">
            <NTag v-if="rawData.stars !== undefined" size="small" type="warning">
              ⭐ {{ rawData.stars }}
            </NTag>
            <NTag v-if="rawData.forks !== undefined" size="small" type="info">
              🍴 {{ rawData.forks }}
            </NTag>
            <NTag v-if="rawData.watchers !== undefined" size="small" type="success">
              👀 {{ rawData.watchers }}
            </NTag>
            <NTag v-if="rawData.language" size="small">
              {{ rawData.language }}
            </NTag>
            <NTag v-if="rawData.license" size="small" type="default">
              📄 {{ rawData.license }}
            </NTag>
            <NTag v-if="rawData.version" size="small" type="primary">
              🏷️ {{ rawData.version }}
            </NTag>
          </NSpace>

          <!-- Topics -->
          <div v-if="topics.length > 0" class="mb-4">
            <div class="mb-1 text-xs text-gray-400">Topics</div>
            <NSpace :size="6">
              <NTag
                v-for="topic in topics"
                :key="topic"
                size="small"
                round
                :bordered="false"
                type="info"
              >
                {{ topic }}
              </NTag>
            </NSpace>
          </div>

          <!-- 详细信息 -->
          <NDescriptions
            label-placement="left"
            bordered
            :column="1"
            size="small"
          >
            <NDescriptionsItem label="URL">
              <a
                :href="result.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-500 hover:underline"
              >
                {{ result.url }}
              </a>
            </NDescriptionsItem>
            <NDescriptionsItem label="状态">
              <NTag
                :type="result.status === 'success' ? 'success' : 'error'"
                size="small"
              >
                {{ result.status === 'success' ? '成功' : '失败' }}
              </NTag>
            </NDescriptionsItem>
            <NDescriptionsItem v-if="rawData.author" label="作者">
              <div class="flex items-center gap-2">
                <NAvatar
                  v-if="owner?.avatar"
                  :src="owner.avatar"
                  :size="20"
                  round
                />
                <a
                  v-if="owner?.url"
                  :href="owner.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-500 hover:underline"
                >
                  {{ rawData.author }}
                </a>
                <span v-else>{{ rawData.author }}</span>
              </div>
            </NDescriptionsItem>
            <NDescriptionsItem v-if="rawData.version" label="版本">
              {{ rawData.version }}
            </NDescriptionsItem>
            <NDescriptionsItem v-if="rawData.license" label="协议">
              {{ rawData.license }}
            </NDescriptionsItem>
            <NDescriptionsItem v-if="rawData.homepage" label="主页">
              <a
                :href="rawData.homepage as string"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-500 hover:underline"
              >
                {{ rawData.homepage }}
              </a>
            </NDescriptionsItem>
            <NDescriptionsItem v-if="rawData.defaultBranch" label="默认分支">
              {{ rawData.defaultBranch }}
            </NDescriptionsItem>
            <NDescriptionsItem label="耗时">
              {{ result.elapsedMs != null ? `${(result.elapsedMs / 1000).toFixed(1)}s` : '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="爬取时间">
              {{ new Date(result.createdAt).toLocaleString('zh-CN') }}
            </NDescriptionsItem>
            <NDescriptionsItem v-if="result.errorMsg" label="错误信息">
              <span style="color: var(--error-color)">{{ result.errorMsg }}</span>
            </NDescriptionsItem>
          </NDescriptions>

          <!-- README -->
          <div v-if="rawData.readme || rawData.readmeSummary" class="mt-4">
            <div class="mb-2 flex items-center gap-2 text-xs text-gray-400">
              <span>📖 README</span>
              <NButton
                v-if="rawData.readme"
                size="tiny"
                quaternary
                @click="readmeCollapsed = !readmeCollapsed"
              >
                {{ readmeCollapsed ? '展开完整内容' : '收起' }}
              </NButton>
            </div>
            <!-- 摘要（折叠时显示） -->
            <div
              v-if="readmeCollapsed && rawData.readmeSummary"
              class="rounded bg-gray-50 p-3 text-sm dark:bg-gray-800"
            >
              {{ rawData.readmeSummary }}
            </div>
            <!-- 完整 README Markdown（展开时显示） -->
            <div
              v-if="!readmeCollapsed && rawData.readme"
              class="readme-content rounded border border-gray-200 p-4 dark:border-gray-700"
              v-html="renderedReadme"
            />
          </div>

          <!-- 正文内容（通用爬虫） -->
          <div
            v-if="result.content && !rawData.fullName"
            class="mt-4"
          >
            <div class="mb-1 text-xs text-gray-400">正文内容</div>
            <div class="rounded bg-gray-50 p-3 text-sm dark:bg-gray-800" style="white-space: pre-wrap">
              {{ result.content }}
            </div>
          </div>

          <!-- 原始数据 -->
          <div class="mt-4">
            <div class="mb-1 text-xs text-gray-400">原始数据 (rawData)</div>
            <pre class="overflow-auto rounded bg-gray-50 p-3 text-xs dark:bg-gray-800" style="max-height: 300px">{{ JSON.stringify(rawData, null, 2) }}</pre>
          </div>
        </NScrollbar>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>


<style scoped>
.readme-content :deep(h1) {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid #e5e7eb;
}

.readme-content :deep(h2) {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.readme-content :deep(h3) {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0.75rem 0 0.4rem;
}

.readme-content :deep(p) {
  margin: 0.4rem 0;
  line-height: 1.7;
  font-size: 0.875rem;
}

.readme-content :deep(ul),
.readme-content :deep(ol) {
  margin: 0.4rem 0;
  padding-left: 1.5rem;
  font-size: 0.875rem;
}

.readme-content :deep(li) {
  margin: 0.2rem 0;
  line-height: 1.6;
}

.readme-content :deep(pre) {
  margin: 0.5rem 0;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  background: #1e1e2e;
  color: #a6e3a1;
  overflow-x: auto;
  font-size: 0.8rem;
  line-height: 1.5;
}

.readme-content :deep(code) {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.85em;
}

.readme-content :deep(:not(pre) > code) {
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
  background: #f3f4f6;
  color: #d63384;
}

.readme-content :deep(a) {
  color: #3b82f6;
  text-decoration: none;
}

.readme-content :deep(a:hover) {
  text-decoration: underline;
}

.readme-content :deep(blockquote) {
  margin: 0.5rem 0;
  padding: 0.5rem 1rem;
  border-left: 3px solid #6366f1;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.875rem;
}

.readme-content :deep(table) {
  width: 100%;
  margin: 0.5rem 0;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.readme-content :deep(th),
.readme-content :deep(td) {
  padding: 0.4rem 0.75rem;
  border: 1px solid #e5e7eb;
  text-align: left;
}

.readme-content :deep(th) {
  background: #f9fafb;
  font-weight: 600;
}

.readme-content :deep(img) {
  max-width: 100%;
  border-radius: 0.375rem;
}

.readme-content :deep(hr) {
  margin: 0.75rem 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}
</style>

<!-- 暗色模式样式 -->
<style>
html.dark .readme-content h1,
html.dark .readme-content h2 {
  border-bottom-color: #374151;
}

html.dark .readme-content h1,
html.dark .readme-content h2,
html.dark .readme-content h3 {
  color: #f3f4f6;
}

html.dark .readme-content p,
html.dark .readme-content li {
  color: #d1d5db;
}

html.dark .readme-content :not(pre) > code {
  background: #374151;
  color: #f472b6;
}

html.dark .readme-content blockquote {
  background: #1e293b;
  color: #94a3b8;
}

html.dark .readme-content th {
  background: #374151;
  color: #e5e7eb;
}

html.dark .readme-content td {
  color: #d1d5db;
}

html.dark .readme-content th,
html.dark .readme-content td {
  border-color: #4b5563;
}

html.dark .readme-content a {
  color: #60a5fa;
}

html.dark .readme-content hr {
  border-top-color: #374151;
}
</style>
