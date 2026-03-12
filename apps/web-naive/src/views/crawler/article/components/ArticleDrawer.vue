<script lang="ts" setup>
import type { CrawlerApi } from '#/api/modules/crawler';

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import {
  NButton,
  NDrawer,
  NDrawerContent,
  NInput,
  NScrollbar,
  NSelect,
  NSpace,
  NTag,
} from 'naive-ui';

import {
  getArticleApi,
  getArticleVersionsApi,
  getPolishStatusApi,
  polishArticleApi,
  setLatestVersionApi,
  deleteArticleVersionApi,
} from '#/api/modules/crawler';
import { message, dialog } from '#/adapter/naive';
import { renderMarkdown, renderMermaidCharts } from '#/utils/markdown-render';
import { preferences } from '@vben/preferences';

interface Props {
  show: boolean;
  articleId: string;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'refreshList'): void;
}

defineOptions({ name: 'ArticleDrawer' });

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const loading = ref(false);
const article = ref<CrawlerApi.GeneratedArticle | null>(null);

// 版本管理
const versions = ref<CrawlerApi.ArticleVersionItem[]>([]);
const currentVersionId = ref<null | string>(null);

// 润色状态
const polishing = ref(false);
const polishTimer = ref<ReturnType<typeof setInterval> | null>(null);
const customInstructions = ref('');
const showPolishInput = ref(false);

// 版本下拉选项
const versionOptions = computed(() =>
  versions.value.map((v) => ({
    label: `v${v.version}${v.isLatest ? ' (最新)' : ''}${v.status === 'processing' ? ' ⏳' : v.status === 'failed' ? ' ❌' : ''}`,
    value: v.id,
  })),
);

// 是否显示版本选择器（有多个版本时显示下拉框）
const showVersionSelect = computed(() => versions.value.length > 1);

// 当前版本的润色摘要
const currentVersionInfo = computed(() =>
  versions.value.find((v) => v.id === currentVersionId.value),
);

watch(
  () => [props.show, props.articleId],
  async ([show, id]) => {
    if (show && id) {
      await loadArticle(id as string);
      await loadVersions(id as string);
      // 如果加载的文章不是最新版本，自动切换到最新版本
      const latest = versions.value.find((v) => v.isLatest);
      if (latest && latest.id !== currentVersionId.value) {
        await loadArticle(latest.id);
      }
    } else if (!show) {
      stopPolishPolling();
    }
  },
);

onBeforeUnmount(() => {
  stopPolishPolling();
});

async function loadArticle(articleId: string) {
  loading.value = true;
  try {
    article.value = await getArticleApi(articleId);
    currentVersionId.value = article.value?.id ?? null;
  } catch {
    article.value = null;
  } finally {
    loading.value = false;
  }
}

async function loadVersions(articleId: string) {
  try {
    versions.value = await getArticleVersionsApi(articleId);
  } catch {
    versions.value = [];
  }
}

async function handleVersionChange(versionId: string) {
  await loadArticle(versionId);
}

async function handlePolish() {
  if (!article.value) return;
  polishing.value = true;
  try {
    await polishArticleApi(article.value.id, customInstructions.value || undefined);
    message.success('润色任务已提交，正在生成新版本...');
    showPolishInput.value = false;
    startPolishPolling();
  } catch {
    polishing.value = false;
  }
}

function startPolishPolling() {
  stopPolishPolling();
  polishTimer.value = setInterval(async () => {
    if (!article.value) return;
    try {
      const groupId = article.value.groupId || article.value.id;
      const status = await getPolishStatusApi(groupId);
      if (!status.polishing) {
        stopPolishPolling();
        polishing.value = false;
        // 润色完成，用当前文章 id 重新加载版本列表
        const currentId = article.value.id;
        await loadVersions(currentId);
        // 切换到最新版本
        const latest = versions.value.find((v) => v.isLatest);
        if (latest && latest.id !== currentVersionId.value) {
          await loadArticle(latest.id);
          // 版本列表可能因为 id 变化需要重新加载
          await loadVersions(latest.id);
        }
        emit('refreshList');
        message.success('润色完成，已生成新版本');
      }
    } catch {
      // 轮询出错时静默处理
    }
  }, 3000);
}

function stopPolishPolling() {
  if (polishTimer.value) {
    clearInterval(polishTimer.value);
    polishTimer.value = null;
  }
}

async function handleSetLatest() {
  if (!currentVersionId.value || !article.value) return;
  try {
    await setLatestVersionApi(currentVersionId.value);
    message.success('已设为最新版本');
    await loadVersions(article.value.id);
    emit('refreshList');
  } catch {
    // 错误已被拦截器处理
  }
}

function handleDeleteVersion() {
  if (!currentVersionId.value || !article.value) return;
  if (versions.value.length <= 1) {
    message.warning('不能删除唯一版本');
    return;
  }
  const ver = currentVersionInfo.value;
  dialog.warning({
    title: '确认删除',
    content: `确定删除 v${ver?.version ?? ''}？此操作不可恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteArticleVersionApi(currentVersionId.value!);
        message.success('版本已删除');
        // 重新加载版本列表，切换到最新版本
        const remaining = versions.value.filter((v) => v.id !== currentVersionId.value);
        const target = remaining.find((v) => v.isLatest) || remaining[0];
        if (target) {
          await loadArticle(target.id);
          await loadVersions(target.id);
        }
        emit('refreshList');
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
}

const renderedContent = computed(() => {
  if (!article.value?.content) return '';
  const isDark = preferences.theme.mode === 'dark';
  return renderMarkdown(article.value.content, isDark);
});

// mermaid 渲染
const contentRef = ref<HTMLElement | null>(null);

watch(renderedContent, async () => {
  await nextTick();
  if (contentRef.value) {
    await renderMermaidCharts(contentRef.value);
  }
});

function copyContent() {
  if (!article.value?.content) return;
  navigator.clipboard.writeText(article.value.content).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
}

const copied = ref(false);
</script>

<template>
  <NDrawer
    :show="show"
    :width="720"
    placement="right"
    @update:show="emit('update:show', $event)"
  >
    <NDrawerContent closable>
      <template #header>
        <div class="flex items-center gap-2">
          <span>{{ article?.articleType === 'tutorial' ? '🔧' : '📝' }} {{ article?.title || '文章详情' }}</span>
          <NTag
            v-if="article?.articleType"
            size="small"
            :type="article.articleType === 'tutorial' ? 'success' : 'info'"
            :bordered="false"
          >
            {{ article.articleType === 'tutorial' ? '实践教程' : '深度解析' }}
          </NTag>
        </div>
      </template>

      <div v-if="loading" class="flex items-center justify-center py-20 text-gray-400">
        加载中...
      </div>

      <template v-else-if="article">
        <NScrollbar style="max-height: calc(100vh - 100px)">
          <!-- 版本选择 + 润色操作 -->
          <div class="mb-4 flex items-center gap-3">
            <NSelect
              v-if="showVersionSelect"
              v-model:value="currentVersionId"
              :options="versionOptions"
              size="small"
              style="width: 180px"
              @update:value="handleVersionChange"
            />
            <NTag v-else-if="article.version" size="small" :bordered="false">
              v{{ article.version }}
            </NTag>
            <NButton
              size="small"
              type="primary"
              :loading="polishing"
              :disabled="polishing || article.status === 'processing'"
              @click="showPolishInput ? handlePolish() : (showPolishInput = true)"
            >
              {{ polishing ? '润色中...' : '✨ 润色' }}
            </NButton>
            <NButton
              v-if="showPolishInput && !polishing"
              size="small"
              @click="showPolishInput = false; customInstructions = ''"
            >
              取消
            </NButton>
            <NButton
              v-if="currentVersionInfo && !currentVersionInfo.isLatest && article.status === 'success'"
              size="small"
              @click="handleSetLatest"
            >
              设为最新
            </NButton>
            <NButton
              v-if="showVersionSelect"
              size="small"
              type="error"
              :disabled="polishing"
              @click="handleDeleteVersion"
            >
              🗑 删除此版本
            </NButton>
          </div>

          <!-- 自定义润色方向 -->
          <div
            v-if="showPolishInput && !polishing"
            class="mb-4 rounded border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950"
          >
            <div class="mb-2 text-xs text-gray-500 dark:text-gray-400">
              自定义润色方向（可选，留空则使用默认润色策略）
            </div>
            <NInput
              v-model:value="customInstructions"
              type="textarea"
              placeholder="例如：重点补充性能对比数据、增加更多代码示例、优化文章开头的吸引力、补充 Docker 部署的踩坑经验..."
              :autosize="{ minRows: 2, maxRows: 5 }"
              size="small"
            />
            <div class="mt-2 flex justify-end">
              <NButton
                size="small"
                type="primary"
                @click="handlePolish"
              >
                开始润色
              </NButton>
            </div>
          </div>

          <!-- 润色摘要 -->
          <div
            v-if="currentVersionInfo?.polishSummary"
            class="mb-4 rounded border border-indigo-200 bg-indigo-50 p-3 text-sm dark:border-indigo-800 dark:bg-indigo-950"
          >
            <span class="font-medium">📋 润色摘要：</span>
            {{ currentVersionInfo.polishSummary }}
          </div>

          <!-- 元信息 -->
          <div class="mb-4 space-y-2">
            <div class="flex items-center gap-2">
              <NTag v-if="article.projectName" size="small" type="success" :bordered="false">
                {{ article.projectName }}
              </NTag>
              <NTag v-if="article.category" size="small" type="info" :bordered="false">
                {{ article.category }}
              </NTag>
              <span class="text-xs text-gray-400">
                {{ article.wordCount.toLocaleString() }} 字符 · {{ article.tokensUsed.toLocaleString() }} tokens
              </span>
            </div>
            <NSpace v-if="article.tags?.length" :size="4">
              <NTag
                v-for="tag in article.tags"
                :key="tag"
                size="tiny"
                round
                :bordered="false"
              >
                {{ tag }}
              </NTag>
            </NSpace>
            <div class="flex items-center gap-2">
              <NButton size="tiny" @click="copyContent">
                {{ copied ? '已复制 ✓' : '复制 Markdown' }}
              </NButton>
              <a
                v-if="article.projectUrl"
                :href="article.projectUrl"
                target="_blank"
                class="text-xs text-blue-500 hover:underline"
              >
                查看项目 →
              </a>
            </div>
          </div>

          <!-- 文章内容 -->
          <div
            ref="contentRef"
            class="article-content rounded border border-gray-200 p-5 dark:border-gray-700"
            v-html="renderedContent"
          />

          <!-- 底部信息 -->
          <div class="mt-4 text-xs text-gray-400">
            模型: {{ article.model }} · v{{ article.version }} · 生成于 {{ article.createdAt ? new Date(article.createdAt).toLocaleString() : '-' }}
          </div>
        </NScrollbar>
      </template>

      <div v-else class="flex items-center justify-center py-20 text-gray-400">
        暂无文章数据
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.article-content :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 1.5rem 0 1rem;
}

.article-content :deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1.25rem 0 0.75rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid #e5e7eb;
}

.article-content :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.article-content :deep(p) {
  margin: 0.5rem 0;
  line-height: 1.75;
  font-size: 0.9rem;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  font-size: 0.9rem;
}

.article-content :deep(li) {
  margin: 0.25rem 0;
  line-height: 1.65;
}

.article-content :deep(pre) {
  margin: 0.75rem 0;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  background: #1e1e2e;
  color: #a6e3a1;
  overflow-x: auto;
  font-size: 0.8rem;
  line-height: 1.5;
}

.article-content :deep(code) {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.85em;
}

.article-content :deep(:not(pre) > code) {
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
  background: #f3f4f6;
  color: #d63384;
  font-size: 0.85em;
}

.article-content :deep(a) {
  color: #3b82f6;
  text-decoration: none;
}

.article-content :deep(a:hover) {
  text-decoration: underline;
}

.article-content :deep(blockquote) {
  margin: 0.75rem 0;
  padding: 0.5rem 1rem;
  border-left: 3px solid #6366f1;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.9rem;
}

.article-content :deep(table) {
  width: 100%;
  margin: 0.75rem 0;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.article-content :deep(th),
.article-content :deep(td) {
  padding: 0.4rem 0.75rem;
  border: 1px solid #e5e7eb;
  text-align: left;
}

.article-content :deep(th) {
  background: #f9fafb;
  font-weight: 600;
  color: #1f2937;
}

.article-content :deep(strong) {
  font-weight: 600;
}

.article-content :deep(hr) {
  margin: 1.5rem 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}

.article-content :deep(.mermaid-wrapper) {
  margin: 1rem 0;
  padding: 1rem;
  border-radius: 0.5rem;
  background: #f8fafc;
  overflow-x: auto;
  text-align: center;
}

.article-content :deep(.mermaid-wrapper svg) {
  max-width: 100%;
  height: auto;
}

.article-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 0.75rem auto;
  display: block;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>

<style>
html.dark .article-content h1,
html.dark .article-content h2,
html.dark .article-content h3 {
  color: #f3f4f6;
}

html.dark .article-content h2 {
  border-bottom-color: #374151;
}

html.dark .article-content p,
html.dark .article-content li {
  color: #d1d5db;
}

html.dark .article-content :not(pre) > code {
  background: #374151;
  color: #f472b6;
}

html.dark .article-content blockquote {
  background: #1e293b;
  color: #94a3b8;
}

html.dark .article-content th {
  background: #374151;
  color: #e5e7eb;
}

html.dark .article-content td {
  color: #d1d5db;
}

html.dark .article-content th,
html.dark .article-content td {
  border-color: #4b5563;
}

html.dark .article-content hr {
  border-top-color: #374151;
}

html.dark .article-content .mermaid-wrapper {
  background: #1e293b;
}

html.dark .article-content img {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>
