<script lang="ts" setup>
interface Props {
  data: Record<string, any>;
}

defineProps<Props>();
</script>

<template>
  <!-- 数据分析 -->
  <div v-if="data.dataAnalysis" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">🗃️ 数据分析</div>
    <div class="rounded border border-violet-200 p-3 dark:border-violet-800">
      <div v-if="data.dataAnalysis.dataType" class="mb-2 text-sm">
        <span class="text-gray-500">数据类型：</span>{{ data.dataAnalysis.dataType }}
      </div>
      <div v-if="data.dataAnalysis.scale" class="mb-2 text-sm">
        <span class="text-gray-500">数据规模：</span>{{ data.dataAnalysis.scale }}
      </div>
      <div v-if="data.dataAnalysis.format" class="mb-2 text-sm">
        <span class="text-gray-500">数据格式：</span>{{ data.dataAnalysis.format }}
      </div>
      <div v-if="data.dataAnalysis.downloadMethod" class="mb-2 text-sm">
        <span class="text-gray-500">获取方式：</span>{{ data.dataAnalysis.downloadMethod }}
      </div>
      <div v-if="data.dataAnalysis.quality" class="text-sm">
        <span class="text-gray-500">质量评估：</span>{{ data.dataAnalysis.quality }}
      </div>
    </div>
  </div>

  <!-- 适用场景 -->
  <div v-if="data.applicableScenarios?.length" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">🎯 适用场景</div>
    <ul class="ml-4 list-disc text-sm">
      <li v-for="s in data.applicableScenarios" :key="s">{{ s }}</li>
    </ul>
  </div>

  <!-- Benchmark 结果 -->
  <div v-if="data.benchmarkResults" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">📊 Benchmark 结果</div>
    <div class="rounded bg-violet-50 p-3 text-sm dark:bg-violet-900/20">{{ data.benchmarkResults }}</div>
  </div>
</template>
