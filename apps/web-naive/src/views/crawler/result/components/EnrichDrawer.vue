<script lang="ts" setup>
import type { CrawlerApi } from '#/api/modules/crawler';
import type { Component } from 'vue';

import { computed, nextTick, ref, watch } from 'vue';

import { NButton, NDrawer, NDrawerContent, NScrollbar, NSpace, NTag } from 'naive-ui';
import { useRouter } from 'vue-router';

import EnrichApplication from './enrich/EnrichApplication.vue';
import EnrichCli from './enrich/EnrichCli.vue';
import EnrichCommon from './enrich/EnrichCommon.vue';
import EnrichData from './enrich/EnrichData.vue';
import EnrichDocs from './enrich/EnrichDocs.vue';
import EnrichLibrary from './enrich/EnrichLibrary.vue';
import { getArticleByResultApi } from '#/api/modules/crawler';
import { renderMarkdown, renderMermaidCharts } from '#/utils/markdown-render';
import { preferences } from '@vben/preferences';

interface Props {
  show: boolean;
  data: CrawlerApi.EnrichedResult | null;
  loading?: boolean;
  canStop?: boolean;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'stop'): void;
}

defineOptions({ name: 'EnrichDrawer' });

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  canStop: false,
});
const emit = defineEmits<Emits>();

const statusMap: Record<string, { label: string; type: 'default' | 'error' | 'info' | 'success' | 'warning' }> = {
  pending: { label: '待处理', type: 'default' },
  processing: { label: '处理中', type: 'info' },
  success: { label: '成功', type: 'success' },
  failed: { label: '失败', type: 'error' },
};

const maturityMap: Record<string, { label: string; type: 'default' | 'error' | 'info' | 'success' | 'warning' }> = {
  experimental: { label: '实验性', type: 'default' },
  early: { label: '早期', type: 'warning' },
  stable: { label: '稳定', type: 'success' },
  mature: { label: '成熟', type: 'info' },
};

const projectTypeMap: Record<string, { icon: string; label: string }> = {
  library: { label: '库/框架', icon: '📦' },
  application: { label: '应用程序', icon: '🖥️' },
  cli: { label: 'CLI 工具', icon: '⌨️' },
  docs: { label: '文档/教程', icon: '📖' },
  data: { label: '数据集/模型', icon: '🗃️' },
  other: { label: '其他', icon: '📁' },
};

const typeComponentMap: Record<string, Component> = {
  library: EnrichLibrary,
  application: EnrichApplication,
  cli: EnrichCli,
  docs: EnrichDocs,
  data: EnrichData,
};

const typeInfo = computed(() => {
  const t = props.data?.projectType || 'other';
  return projectTypeMap[t] ?? projectTypeMap.other!;
});

const typeComponent = computed(() => {
  const t = props.data?.projectType || 'other';
  return typeComponentMap[t] || null;
});

const typeSpecific = computed(() => props.data?.typeSpecific || {});

const articleCollapsed = ref(false);
const structureCollapsed = ref(false);
const beginnerCollapsed = ref(false);
const developerCollapsed = ref(false);
const tutorialCollapsed = ref(false);
const mermaidCopied = ref(false);
const linkedArticleId = ref<null | string>(null);
const router = useRouter();

const structureAnalysis = computed(() => props.data?.projectStructureAnalysis || {});
const hasStructureAnalysis = computed(() => {
  const s = structureAnalysis.value;
  return s && (s.overview || s.coreModules?.length || s.architectureDiagram || s.workflowDescription);
});

const hasBeginnerGuide = computed(() => {
  const g = props.data?.beginnerGuide;
  return g && (g.whatItDoes || g.whoShouldUse || g.howToStart || g.realWorldAnalogy);
});

const hasDeveloperGuide = computed(() => {
  const g = props.data?.developerGuide;
  return g && (g.whyChooseThis || g.architectureInsight || g.integrationTips || g.codeWorthReading);
});

function copyMermaid() {
  const text = structureAnalysis.value.architectureDiagram || '';
  navigator.clipboard.writeText(text).then(() => {
    mermaidCopied.value = true;
    setTimeout(() => { mermaidCopied.value = false; }, 2000);
  });
}

watch(() => props.data, () => {
  articleCollapsed.value = false;
  structureCollapsed.value = false;
  beginnerCollapsed.value = false;
  developerCollapsed.value = false;
  tutorialCollapsed.value = false;
  mermaidCopied.value = false;
  linkedArticleId.value = null;
  // 查询关联的独立文章
  if (props.data?.resultId) {
    getArticleByResultApi(props.data.resultId)
      .then((res) => { linkedArticleId.value = res.id; })
      .catch(() => { linkedArticleId.value = null; });
  }
});

const renderedArticle = computed(() => {
  if (!props.data?.generatedArticle) return '';
  const isDark = preferences.theme.mode === 'dark';
  return renderMarkdown(props.data.generatedArticle, isDark);
});

const renderedTutorial = computed(() => {
  if (!props.data?.generatedTutorial) return '';
  const isDark = preferences.theme.mode === 'dark';
  return renderMarkdown(props.data.generatedTutorial, isDark);
});

// mermaid 渲染
const articleContentRef = ref<HTMLElement | null>(null);
const tutorialContentRef = ref<HTMLElement | null>(null);

watch([renderedArticle, () => articleCollapsed.value], async () => {
  if (!articleCollapsed.value && renderedArticle.value) {
    await nextTick();
    if (articleContentRef.value) {
      await renderMermaidCharts(articleContentRef.value);
    }
  }
});

watch([renderedTutorial, () => tutorialCollapsed.value], async () => {
  if (!tutorialCollapsed.value && renderedTutorial.value) {
    await nextTick();
    if (tutorialContentRef.value) {
      await renderMermaidCharts(tutorialContentRef.value);
    }
  }
});
</script>

<template>
  <NDrawer
    :show="show"
    :width="680"
    placement="right"
    @update:show="emit('update:show', $event)"
  >
    <NDrawerContent title="AI 增强结果" closable>
      <div v-if="loading" class="flex flex-col items-center justify-center gap-4 py-20">
        <div class="text-gray-400">AI 分析中，请稍候...</div>
        <NButton v-if="canStop" size="small" type="error" ghost @click="emit('stop')">
          停止增强
        </NButton>
      </div>

      <template v-else-if="data">
        <NScrollbar style="max-height: calc(100vh - 100px)">
          <!-- 标题 + 状态 + 成熟度 -->
          <div class="mb-4 flex items-start gap-3">
            <div class="min-w-0 shrink text-lg font-medium" style="word-break: break-word;">{{ data.title }}</div>
            <div class="flex shrink-0 items-center gap-2">
              <NTag :type="statusMap[data.status]?.type ?? 'default'" size="small">
                {{ statusMap[data.status]?.label ?? data.status }}
              </NTag>
              <NTag
                v-if="data.maturityLevel"
                :type="maturityMap[data.maturityLevel]?.type ?? 'default'"
                size="small"
              >
                {{ maturityMap[data.maturityLevel]?.label ?? data.maturityLevel.split('（')[0] }}
              </NTag>
            </div>
          </div>

          <!-- 错误信息 -->
          <div
            v-if="data.errorMsg"
            class="mb-4 rounded bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20"
          >
            {{ data.errorMsg }}
          </div>

          <!-- 一句话介绍（零术语） -->
          <div v-if="data.oneLinerForHumans" class="mb-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-3 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div class="text-sm font-medium leading-relaxed">💡 {{ data.oneLinerForHumans }}</div>
          </div>

          <!-- 摘要 -->
          <div v-if="data.summary" class="mb-4">
            <div class="mb-1 text-xs text-gray-400">项目摘要</div>
            <div class="text-sm">{{ data.summary }}</div>
          </div>

          <!-- 项目类型 + 语言 + 分类 + 难度 -->
          <NSpace class="mb-4" :size="8">
            <NTag v-if="data.projectType" type="success" size="small">
              {{ typeInfo.icon }} {{ typeInfo.label }}
            </NTag>
            <NTag v-if="data.detectedLanguage" size="small" :bordered="false">
              🔤 {{ data.detectedLanguage }}
            </NTag>
            <NTag v-if="data.category" type="info" size="small">📂 {{ data.category }}</NTag>
            <NTag v-if="data.difficultyLevel" type="warning" size="small">📊 {{ data.difficultyLevel }}</NTag>
          </NSpace>

          <!-- 标签 -->
          <div v-if="data.tags.length > 0" class="mb-4">
            <div class="mb-1 text-xs text-gray-400">标签</div>
            <NSpace :size="6">
              <NTag v-for="tag in data.tags" :key="tag" size="small" round :bordered="false" type="info">
                {{ tag }}
              </NTag>
            </NSpace>
          </div>

          <!-- 技术栈 -->
          <div v-if="data.techStack && data.techStack.length > 0" class="mb-4">
            <div class="mb-1 text-xs text-gray-400">🛠 技术栈</div>
            <NSpace :size="6">
              <NTag v-for="tech in data.techStack" :key="tech" size="small" :bordered="false" type="success">
                {{ tech }}
              </NTag>
            </NSpace>
          </div>

          <!-- 小白用户指南 -->
          <div v-if="hasBeginnerGuide" class="mb-4">
            <div class="mb-2 flex items-center gap-2 text-xs text-gray-400">
              <span>🌱 小白用户指南</span>
              <NButton size="tiny" quaternary @click="beginnerCollapsed = !beginnerCollapsed">
                {{ beginnerCollapsed ? '展开' : '收起' }}
              </NButton>
            </div>
            <div v-show="!beginnerCollapsed" class="space-y-3 rounded border border-green-200 p-3 dark:border-green-800">
              <div v-if="data.beginnerGuide?.whatItDoes">
                <div class="mb-1 text-xs font-medium text-green-600 dark:text-green-400">🎯 这是什么</div>
                <div class="text-sm leading-relaxed">{{ data.beginnerGuide.whatItDoes }}</div>
              </div>
              <div v-if="data.beginnerGuide?.whoShouldUse">
                <div class="mb-1 text-xs font-medium text-green-600 dark:text-green-400">👤 适合谁用</div>
                <div class="text-sm leading-relaxed">{{ data.beginnerGuide.whoShouldUse }}</div>
              </div>
              <div v-if="data.beginnerGuide?.howToStart">
                <div class="mb-1 text-xs font-medium text-green-600 dark:text-green-400">🚀 如何开始</div>
                <div class="text-sm leading-relaxed">{{ data.beginnerGuide.howToStart }}</div>
              </div>
              <div v-if="data.beginnerGuide?.realWorldAnalogy">
                <div class="mb-1 text-xs font-medium text-green-600 dark:text-green-400">🔗 通俗类比</div>
                <div class="text-sm leading-relaxed italic">{{ data.beginnerGuide.realWorldAnalogy }}</div>
              </div>
            </div>
          </div>

          <!-- 开发者指南 -->
          <div v-if="hasDeveloperGuide" class="mb-4">
            <div class="mb-2 flex items-center gap-2 text-xs text-gray-400">
              <span>⚡ 开发者指南</span>
              <NButton size="tiny" quaternary @click="developerCollapsed = !developerCollapsed">
                {{ developerCollapsed ? '展开' : '收起' }}
              </NButton>
            </div>
            <div v-show="!developerCollapsed" class="space-y-3 rounded border border-indigo-200 p-3 dark:border-indigo-800">
              <div v-if="data.developerGuide?.whyChooseThis">
                <div class="mb-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">🏆 为什么选它</div>
                <div class="text-sm leading-relaxed">{{ data.developerGuide.whyChooseThis }}</div>
              </div>
              <div v-if="data.developerGuide?.architectureInsight">
                <div class="mb-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">🏗 架构洞察</div>
                <div class="text-sm leading-relaxed">{{ data.developerGuide.architectureInsight }}</div>
              </div>
              <div v-if="data.developerGuide?.integrationTips">
                <div class="mb-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">🔧 集成建议</div>
                <div class="text-sm leading-relaxed">{{ data.developerGuide.integrationTips }}</div>
              </div>
              <div v-if="data.developerGuide?.codeWorthReading">
                <div class="mb-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">📖 值得阅读的源码</div>
                <div class="text-sm leading-relaxed">{{ data.developerGuide.codeWorthReading }}</div>
              </div>
            </div>
          </div>

          <!-- 架构描述 -->
          <div v-if="data.architecture" class="mb-4">
            <div class="mb-1 text-xs text-gray-400">🏗 架构设计</div>
            <div class="rounded bg-gray-50 p-3 text-sm dark:bg-gray-800/50">{{ data.architecture }}</div>
          </div>

          <!-- 项目结构分析 -->
          <div v-if="hasStructureAnalysis" class="mb-4">
            <div class="mb-2 flex items-center gap-2 text-xs text-gray-400">
              <span>🗂 项目结构分析</span>
              <NButton size="tiny" quaternary @click="structureCollapsed = !structureCollapsed">
                {{ structureCollapsed ? '展开' : '收起' }}
              </NButton>
            </div>
            <div v-show="!structureCollapsed" class="space-y-3">
              <!-- 概述 -->
              <div v-if="structureAnalysis.overview" class="rounded bg-gray-50 p-3 text-sm dark:bg-gray-800/50">
                {{ structureAnalysis.overview }}
              </div>

              <!-- 核心模块 -->
              <div v-if="structureAnalysis.coreModules?.length" class="rounded border border-gray-200 p-3 dark:border-gray-700">
                <div class="mb-2 text-xs font-medium text-gray-500">📦 核心模块</div>
                <div class="space-y-2">
                  <div
                    v-for="(mod, idx) in structureAnalysis.coreModules"
                    :key="idx"
                    class="rounded bg-gray-50 p-2 dark:bg-gray-800/50"
                  >
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium">{{ mod.name }}</span>
                      <NTag size="tiny" :bordered="false">{{ mod.path }}</NTag>
                    </div>
                    <div class="mt-1 text-xs text-gray-500">{{ mod.purpose }}</div>
                    <div v-if="mod.keyFiles?.length" class="mt-1">
                      <NSpace :size="4">
                        <NTag v-for="f in mod.keyFiles" :key="f" size="tiny" :bordered="false" type="info">{{ f }}</NTag>
                      </NSpace>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 入口文件 + 配置文件 -->
              <div v-if="structureAnalysis.entryPoints?.length || structureAnalysis.configFiles?.length" class="grid grid-cols-2 gap-3">
                <div v-if="structureAnalysis.entryPoints?.length">
                  <div class="mb-1 text-xs text-gray-500">🚪 入口文件</div>
                  <NSpace :size="4" wrap>
                    <NTag v-for="ep in structureAnalysis.entryPoints" :key="ep" size="small" type="success" :bordered="false">{{ ep }}</NTag>
                  </NSpace>
                </div>
                <div v-if="structureAnalysis.configFiles?.length">
                  <div class="mb-1 text-xs text-gray-500">⚙️ 配置文件</div>
                  <NSpace :size="4" wrap>
                    <NTag v-for="cf in structureAnalysis.configFiles" :key="cf" size="small" :bordered="false">{{ cf }}</NTag>
                  </NSpace>
                </div>
              </div>

              <!-- 架构图（Mermaid） -->
              <div v-if="structureAnalysis.architectureDiagram" class="rounded border border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between border-b border-gray-200 px-3 py-1.5 dark:border-gray-700">
                  <span class="text-xs text-gray-500">📊 架构图 (Mermaid)</span>
                  <NButton size="tiny" quaternary @click="copyMermaid">
                    {{ mermaidCopied ? '已复制' : '复制' }}
                  </NButton>
                </div>
                <pre class="overflow-x-auto p-3 text-xs leading-relaxed"><code>{{ structureAnalysis.architectureDiagram }}</code></pre>
              </div>

              <!-- 工作流程 -->
              <div v-if="structureAnalysis.workflowDescription">
                <div class="mb-1 text-xs text-gray-500">🔄 工作流程</div>
                <div class="rounded bg-gray-50 p-3 text-sm leading-relaxed dark:bg-gray-800/50">
                  {{ structureAnalysis.workflowDescription }}
                </div>
              </div>

              <!-- 设计模式 + 分层架构 -->
              <div v-if="structureAnalysis.designPatterns?.length" class="mb-1">
                <div class="mb-1 text-xs text-gray-500">🎨 设计模式</div>
                <ul class="ml-4 list-disc text-sm">
                  <li v-for="dp in structureAnalysis.designPatterns" :key="dp">{{ dp }}</li>
                </ul>
              </div>

              <div v-if="structureAnalysis.layerStructure">
                <div class="mb-1 text-xs text-gray-500">🏛 分层架构</div>
                <div class="rounded bg-gray-50 p-3 text-sm dark:bg-gray-800/50">{{ structureAnalysis.layerStructure }}</div>
              </div>
            </div>
          </div>

          <!-- 类型专属区域 -->
          <component :is="typeComponent" v-if="typeComponent" :data="typeSpecific" />

          <!-- AI 生成的完整文章 -->
          <!-- <div v-if="data.generatedArticle" class="mb-4">
            <div class="mb-2 flex items-center gap-2 text-xs text-gray-400">
              <span>📝 AI 深度解析文章</span>
              <NButton
                v-if="linkedArticleId"
                size="tiny"
                type="primary"
                @click="router.push('/crawler/article'); emit('update:show', false)"
              >
                在文章列表查看
              </NButton>
              <NButton size="tiny" quaternary @click="articleCollapsed = !articleCollapsed">
                {{ articleCollapsed ? '展开' : '收起' }}
              </NButton>
            </div>
            <div
              v-show="!articleCollapsed"
              ref="articleContentRef"
              class="article-content rounded border border-gray-200 p-4 dark:border-gray-700"
              v-html="renderedArticle"
            />
          </div> -->

          <!-- AI 生成的实践部署教程 -->
          <!-- <div v-if="data.generatedTutorial" class="mb-4">
            <div class="mb-2 flex items-center gap-2 text-xs text-gray-400">
              <span>🔧 实践部署教程</span>
              <NButton size="tiny" quaternary @click="tutorialCollapsed = !tutorialCollapsed">
                {{ tutorialCollapsed ? '展开' : '收起' }}
              </NButton>
            </div>
            <div
              v-show="!tutorialCollapsed"
              ref="tutorialContentRef"
              class="article-content rounded border border-gray-200 p-4 dark:border-gray-700"
              v-html="renderedTutorial"
            />
          </div> -->

          <!-- Library 安装方式（放在类型专属之后） -->
          <div v-if="data.projectType === 'library' && typeSpecific.installMethods?.length" class="mb-4">
            <div class="mb-1 text-xs text-gray-400">📥 安装方式</div>
            <div class="space-y-1">
              <pre v-for="m in typeSpecific.installMethods" :key="m" class="rounded bg-gray-900 p-2 text-xs text-green-400"><code>{{ m }}</code></pre>
            </div>
          </div>

          <!-- 通用区域 -->
          <EnrichCommon :data="data" />
        </NScrollbar>
      </template>

      <div v-else class="flex items-center justify-center py-20 text-gray-400">
        暂无增强数据
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
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
  line-height: 1.7;
  font-size: 0.875rem;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  font-size: 0.875rem;
}

.article-content :deep(li) {
  margin: 0.25rem 0;
  line-height: 1.6;
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
  font-size: 0.875rem;
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

<!-- 暗色模式样式：unscoped 才能匹配 html.dark，用 .article-content 手动限定作用域 -->
<style>
html.dark .article-content h2 {
  border-bottom-color: #374151;
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

html.dark .article-content p,
html.dark .article-content li {
  color: #d1d5db;
}

html.dark .article-content h2,
html.dark .article-content h3 {
  color: #f3f4f6;
}

html.dark .article-content a {
  color: #60a5fa;
}

html.dark .article-content .mermaid-wrapper {
  background: #1e293b;
}

html.dark .article-content img {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>
