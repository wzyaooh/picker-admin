<script lang="ts" setup>
import type { CrawlerApi } from '#/api/modules/crawler';

import { computed } from 'vue';

import { NDescriptions, NDescriptionsItem, NProgress, NSpace, NTag } from 'naive-ui';

interface Props {
  data: CrawlerApi.EnrichedResult;
}

const props = defineProps<Props>();

const hasMigrationGuide = computed(() => {
  const guide = props.data.migrationGuide;
  return guide && guide.fromProjects && guide.fromProjects.length > 0;
});

const hasCodeQuality = computed(() => {
  const score = props.data.codeQualityScore;
  return score && (score.overall || score.assessment);
});

const projectTypeMap: Record<string, { icon: string; label: string }> = {
  library: { label: '库/框架', icon: '📦' },
  application: { label: '应用程序', icon: '🖥️' },
  cli: { label: 'CLI 工具', icon: '⌨️' },
  docs: { label: '文档/教程', icon: '📖' },
  data: { label: '数据集/模型', icon: '🗃️' },
  other: { label: '其他', icon: '📁' },
};

const typeInfo = computed(() => {
  const t = props.data.projectType || 'other';
  return projectTypeMap[t] ?? projectTypeMap.other!;
});

const insightSections = computed(() => {
  const text = props.data.insights || '';
  // insights 字段可能包含技术分析和市场定位（用双换行分隔）
  const parts = text.split(/\n\n+/).filter((s: string) => s.trim());
  return parts.length > 0 ? parts : [text];
});
</script>

<template>
  <div>
    <!-- 核心亮点 -->
    <div v-if="data.highlights.length > 0" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">核心亮点</div>
      <ul class="ml-4 list-disc text-sm">
        <li v-for="item in data.highlights" :key="item">{{ item }}</li>
      </ul>
    </div>

    <!-- 适用场景 -->
    <div v-if="data.useCases.length > 0" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">适用场景</div>
      <ul class="ml-4 list-disc text-sm">
        <li v-for="item in data.useCases" :key="item">{{ item }}</li>
      </ul>
    </div>

    <!-- 优缺点 -->
    <div v-if="data.pros.length > 0 || data.cons.length > 0" class="mb-4">
      <div class="grid grid-cols-2 gap-4">
        <div v-if="data.pros.length > 0">
          <div class="mb-1 text-xs text-gray-400">✅ 优点</div>
          <ul class="ml-4 list-disc text-sm">
            <li v-for="item in data.pros" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div v-if="data.cons.length > 0">
          <div class="mb-1 text-xs text-gray-400">⚠️ 不足</div>
          <ul class="ml-4 list-disc text-sm">
            <li v-for="item in data.cons" :key="item">{{ item }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 快速开始代码 -->
    <div v-if="data.quickStartCode" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">⚡ 快速开始</div>
      <pre class="overflow-x-auto rounded bg-gray-900 p-3 text-xs text-green-400 dark:bg-gray-950"><code>{{ data.quickStartCode }}</code></pre>
    </div>

    <!-- 最佳实践 -->
    <div v-if="data.bestPractices && data.bestPractices.length > 0" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">📋 最佳实践</div>
      <ul class="ml-4 list-disc text-sm">
        <li v-for="item in data.bestPractices" :key="item">{{ item }}</li>
      </ul>
    </div>

    <!-- 代码质量评分 -->
    <div v-if="hasCodeQuality" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">📊 代码质量评分</div>
      <div class="rounded border border-gray-200 p-3 dark:border-gray-700">
        <div v-if="data.codeQualityScore.overall" class="mb-2 flex items-center gap-3">
          <span class="text-2xl font-bold">{{ data.codeQualityScore.overall }}</span>
          <span class="text-xs text-gray-400">/ 10</span>
          <NProgress type="line" :percentage="(data.codeQualityScore.overall as number) * 10" :show-indicator="false" :height="8" class="flex-1" />
        </div>
        <div v-if="data.codeQualityScore.dimensions" class="mb-2 grid grid-cols-5 gap-2 text-center text-xs">
          <div v-if="data.codeQualityScore.dimensions.readability">
            <div class="text-gray-400">可读性</div>
            <div class="font-medium">{{ data.codeQualityScore.dimensions.readability }}</div>
          </div>
          <div v-if="data.codeQualityScore.dimensions.testCoverage">
            <div class="text-gray-400">测试</div>
            <div class="font-medium">{{ data.codeQualityScore.dimensions.testCoverage }}</div>
          </div>
          <div v-if="data.codeQualityScore.dimensions.documentation">
            <div class="text-gray-400">文档</div>
            <div class="font-medium">{{ data.codeQualityScore.dimensions.documentation }}</div>
          </div>
          <div v-if="data.codeQualityScore.dimensions.architecture">
            <div class="text-gray-400">架构</div>
            <div class="font-medium">{{ data.codeQualityScore.dimensions.architecture }}</div>
          </div>
          <div v-if="data.codeQualityScore.dimensions.errorHandling">
            <div class="text-gray-400">错误处理</div>
            <div class="font-medium">{{ data.codeQualityScore.dimensions.errorHandling }}</div>
          </div>
        </div>
        <div v-if="data.codeQualityScore.assessment" class="text-xs text-gray-500">{{ data.codeQualityScore.assessment }}</div>
      </div>
    </div>

    <!-- 社区健康度 -->
    <div v-if="data.communityHealth && data.communityHealth.assessment" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">🏥 社区健康度</div>
      <div class="rounded border border-gray-200 p-3 dark:border-gray-700">
        <div class="mb-2 flex flex-wrap gap-2">
          <NTag v-if="data.communityHealth.maintenanceFrequency" size="tiny" :bordered="false">维护频率: {{ data.communityHealth.maintenanceFrequency }}</NTag>
          <NTag v-if="data.communityHealth.issueResponseSpeed" size="tiny" :bordered="false">Issue 响应: {{ data.communityHealth.issueResponseSpeed }}</NTag>
          <NTag v-if="data.communityHealth.communitySize" size="tiny" :bordered="false">社区规模: {{ data.communityHealth.communitySize }}</NTag>
          <NTag v-if="data.communityHealth.documentationQuality" size="tiny" :bordered="false">文档质量: {{ data.communityHealth.documentationQuality }}</NTag>
          <NTag v-if="data.communityHealth.releaseActivity" size="tiny" :bordered="false">发布活跃: {{ data.communityHealth.releaseActivity }}</NTag>
          <NTag v-if="data.communityHealth.overallScore" size="tiny" type="info" :bordered="false">综合评分: {{ data.communityHealth.overallScore }}/10</NTag>
        </div>
        <div class="text-xs text-gray-500">{{ data.communityHealth.assessment }}</div>
      </div>
    </div>

    <!-- 安全注意事项 -->
    <div v-if="data.securityConsiderations && data.securityConsiderations.length > 0" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">🔒 安全注意事项</div>
      <ul class="ml-4 list-disc text-sm">
        <li v-for="item in data.securityConsiderations" :key="item">{{ item }}</li>
      </ul>
    </div>

    <!-- 部署信息 -->
    <div v-if="(data.deployMethods && data.deployMethods.length > 0) || (data.deploySteps && data.deploySteps.length > 0)" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">🚀 部署信息</div>
      <div class="rounded border border-gray-200 p-3 dark:border-gray-700">
        <div v-if="data.deployMethods && data.deployMethods.length > 0" class="mb-2">
          <div class="mb-1 text-xs text-gray-500">部署方式</div>
          <NSpace :size="6">
            <NTag v-for="m in data.deployMethods" :key="m" size="small" type="warning">{{ m }}</NTag>
          </NSpace>
        </div>
        <div v-if="data.deploySteps && data.deploySteps.length > 0" class="mb-2">
          <div class="mb-1 text-xs text-gray-500">部署步骤</div>
          <ol class="ml-4 list-decimal text-sm">
            <li v-for="step in data.deploySteps" :key="step">{{ step }}</li>
          </ol>
        </div>
        <div v-if="data.systemRequirements" class="mt-2">
          <div class="mb-1 text-xs text-gray-500">系统要求</div>
          <div class="text-sm">{{ data.systemRequirements }}</div>
        </div>
      </div>
    </div>

    <!-- 学习资源（仅兼容旧数据展示） -->
    <div v-if="data.learningResources && data.learningResources.length > 0" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">📚 学习资源（历史数据）</div>
      <div class="space-y-2">
        <div v-for="(res, idx) in data.learningResources" :key="idx" class="rounded border border-gray-200 p-2 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <NTag size="tiny" :bordered="false">{{ res.type }}</NTag>
            <a v-if="res.url" :href="res.url" target="_blank" rel="noopener noreferrer" class="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">{{ res.title }}</a>
            <span v-else class="text-sm font-medium">{{ res.title }}</span>
          </div>
          <div v-if="res.description" class="mt-1 text-xs text-gray-500">{{ res.description }}</div>
        </div>
      </div>
    </div>

    <!-- 迁移指南 -->
    <div v-if="hasMigrationGuide" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">🔄 迁移指南</div>
      <div class="space-y-2">
        <div v-for="(proj, idx) in data.migrationGuide.fromProjects" :key="idx" class="rounded border border-gray-200 p-2 dark:border-gray-700">
          <div class="mb-1 flex items-center gap-2">
            <span class="text-sm font-medium">从 {{ proj.name }} 迁移</span>
            <NTag size="tiny" :type="proj.difficulty === '简单' ? 'success' : proj.difficulty === '复杂' ? 'error' : 'warning'">{{ proj.difficulty }}</NTag>
          </div>
          <ol class="ml-4 list-decimal text-xs">
            <li v-for="step in proj.steps" :key="step">{{ step }}</li>
          </ol>
          <div v-if="proj.notes" class="mt-1 text-xs text-gray-500">⚠️ {{ proj.notes }}</div>
        </div>
      </div>
    </div>

    <!-- 参考项目 -->
    <div v-if="data.inspiredBy && data.inspiredBy.length > 0" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">💡 参考/受启发的项目</div>
      <NSpace :size="6">
        <NTag v-for="p in data.inspiredBy" :key="p" size="small">{{ p }}</NTag>
      </NSpace>
    </div>

    <!-- 类似项目 -->
    <div v-if="data.similarProjects.length > 0" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">类似项目</div>
      <NSpace :size="6">
        <NTag v-for="p in data.similarProjects" :key="p" size="small">{{ p }}</NTag>
      </NSpace>
    </div>

    <!-- 推荐语 -->
    <div v-if="data.recommendation" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">推荐语</div>
      <div class="rounded bg-blue-50 p-3 text-sm dark:bg-blue-900/20">{{ data.recommendation }}</div>
    </div>

    <!-- 全网参考文章（webArticleSummaries 复用 webReferences 字段） -->
    <div v-if="data.webReferences && data.webReferences.length > 0" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">🔗 全网文章摘要</div>
      <div class="space-y-2">
        <div v-for="(ref, idx) in data.webReferences" :key="idx" class="rounded border border-gray-200 p-2 dark:border-gray-700">
          <div class="text-sm font-medium">{{ ref.title }}</div>
          <div v-if="ref.keyInsights" class="mt-1 text-xs text-gray-600 dark:text-gray-400">💡 {{ ref.keyInsights }}</div>
          <div v-if="ref.relevance" class="mt-1 text-xs text-gray-500">📌 {{ ref.relevance }}</div>
          <!-- 兼容旧数据：url + summary 格式 -->
          <template v-if="!ref.keyInsights && ref.url">
            <a :href="ref.url" target="_blank" rel="noopener noreferrer" class="text-sm text-blue-600 hover:underline dark:text-blue-400">{{ ref.url }}</a>
            <div v-if="ref.summary" class="mt-1 text-xs text-gray-500">{{ ref.summary }}</div>
          </template>
        </div>
      </div>
    </div>

    <!-- 深度思考 -->
    <div v-if="(data.extensionIdeas && data.extensionIdeas.length > 0) || (data.projectIdeas && data.projectIdeas.length > 0) || data.insights" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">🧠 深度思考</div>
      <div class="rounded border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-800 dark:bg-purple-900/20">
        <!-- insights 可能包含技术分析和市场定位（用双换行分隔） -->
        <div v-if="data.insights" class="mb-3">
          <div v-for="(section, idx) in insightSections" :key="idx" class="mb-2">
            <div class="mb-1 text-xs font-medium text-purple-600 dark:text-purple-400">
              {{ idx === 0 ? '🔬 技术分析' : '📈 市场定位' }}
            </div>
            <div class="text-sm leading-relaxed">{{ section }}</div>
          </div>
        </div>
        <div v-if="data.extensionIdeas && data.extensionIdeas.length > 0" class="mb-3">
          <div class="mb-1 text-xs font-medium text-purple-600 dark:text-purple-400">🚀 扩展方向</div>
          <ul class="ml-4 list-disc text-sm">
            <li v-for="idea in data.extensionIdeas" :key="idea">{{ idea }}</li>
          </ul>
        </div>
        <div v-if="data.projectIdeas && data.projectIdeas.length > 0" class="mb-3">
          <div class="mb-1 text-xs font-medium text-purple-600 dark:text-purple-400">💡 项目创意</div>
          <ul class="ml-4 list-disc text-sm">
            <li v-for="idea in data.projectIdeas" :key="idea">{{ idea }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 数据来源 -->
    <div v-if="data.dataSources && data.dataSources.length > 0" class="mb-4">
      <div class="mb-1 text-xs text-gray-400">📊 数据来源</div>
      <NSpace :size="6">
        <NTag v-for="src in data.dataSources" :key="src" size="tiny" :bordered="false">{{ src }}</NTag>
      </NSpace>
    </div>

    <!-- 元信息 -->
    <NDescriptions label-placement="left" bordered :column="1" size="small" class="mt-4">
      <NDescriptionsItem label="项目类型">{{ typeInfo.icon }} {{ typeInfo.label }}</NDescriptionsItem>
      <NDescriptionsItem label="检测语言">{{ data.detectedLanguage || '-' }}</NDescriptionsItem>
      <NDescriptionsItem label="模型">{{ data.model || '-' }}</NDescriptionsItem>
      <NDescriptionsItem label="Token 消耗">{{ data.tokensUsed }}</NDescriptionsItem>
      <NDescriptionsItem label="生成时间">{{ data.updatedAt ? new Date(data.updatedAt).toLocaleString('zh-CN') : '-' }}</NDescriptionsItem>
    </NDescriptions>
  </div>
</template>
