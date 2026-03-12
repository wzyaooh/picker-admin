<script lang="ts" setup>
interface Props {
  data: Record<string, any>;
}

defineProps<Props>();
</script>

<template>
  <!-- 内容分析 -->
  <div v-if="data.contentAnalysis" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">📖 内容分析</div>
    <div class="rounded border border-amber-200 p-3 dark:border-amber-800">
      <div v-if="data.contentAnalysis.scope" class="mb-2 text-sm">
        <span class="text-gray-500">覆盖范围：</span>{{ data.contentAnalysis.scope }}
      </div>
      <div v-if="data.contentAnalysis.structure" class="mb-2 text-sm">
        <span class="text-gray-500">组织方式：</span>{{ data.contentAnalysis.structure }}
      </div>
      <div v-if="data.contentAnalysis.targetAudience" class="mb-2 text-sm">
        <span class="text-gray-500">目标受众：</span>{{ data.contentAnalysis.targetAudience }}
      </div>
      <div v-if="data.contentAnalysis.contentFormat" class="mb-2 text-sm">
        <span class="text-gray-500">内容格式：</span>{{ data.contentAnalysis.contentFormat }}
      </div>
      <div v-if="data.contentAnalysis.lastUpdateAssessment" class="mb-2 text-sm">
        <span class="text-gray-500">时效性：</span>{{ data.contentAnalysis.lastUpdateAssessment }}
      </div>
      <div v-if="data.contentAnalysis.qualityHighlights" class="text-sm">
        <span class="text-gray-500">质量亮点：</span>{{ data.contentAnalysis.qualityHighlights }}
      </div>
    </div>
  </div>

  <!-- 学习路径 -->
  <div v-if="data.learningPath?.length" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">🗺️ 学习路径</div>
    <ol class="ml-4 list-decimal text-sm">
      <li v-for="step in data.learningPath" :key="step">{{ step }}</li>
    </ol>
  </div>

  <!-- 独特价值 -->
  <div v-if="data.uniqueValue" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">💎 独特价值</div>
    <div class="rounded bg-amber-50 p-3 text-sm dark:bg-amber-900/20">{{ data.uniqueValue }}</div>
  </div>
</template>
