<script lang="ts" setup>
import { NSpace, NTag } from 'naive-ui';

interface Props {
  data: Record<string, any>;
}

defineProps<Props>();
</script>

<template>
  <!-- API 设计 -->
  <div v-if="data.apiDesign" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">🔌 API 设计</div>
    <div class="rounded border border-green-200 p-3 dark:border-green-800">
      <div v-if="data.apiDesign.style" class="mb-2 text-sm">
        <span class="text-gray-500">风格：</span>{{ data.apiDesign.style }}
      </div>
      <div v-if="data.apiDesign.coreApis?.length" class="mb-2">
        <div class="mb-1 text-xs text-gray-500">核心 API</div>
        <ul class="ml-4 list-disc text-sm">
          <li v-for="api in data.apiDesign.coreApis" :key="api">{{ api }}</li>
        </ul>
      </div>
      <div v-if="data.apiDesign.typeSupport" class="mb-1 text-sm">
        <span class="text-gray-500">类型支持：</span>{{ data.apiDesign.typeSupport }}
      </div>
      <div v-if="data.apiDesign.extensibility" class="text-sm">
        <span class="text-gray-500">扩展机制：</span>{{ data.apiDesign.extensibility }}
      </div>
    </div>
  </div>

  <!-- 兼容性 -->
  <div v-if="data.compatibility" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">🔗 兼容性</div>
    <div class="rounded border border-gray-200 p-3 dark:border-gray-700">
      <div v-if="data.compatibility.runtimes?.length" class="mb-2">
        <NSpace :size="6">
          <NTag v-for="r in data.compatibility.runtimes" :key="r" size="small" :bordered="false">{{ r }}</NTag>
        </NSpace>
      </div>
      <div v-if="data.compatibility.frameworks?.length" class="mb-2">
        <NSpace :size="6">
          <NTag v-for="f in data.compatibility.frameworks" :key="f" size="small" type="info" :bordered="false">{{ f }}</NTag>
        </NSpace>
      </div>
      <div v-if="data.compatibility.breakingChanges" class="text-xs text-orange-600">
        ⚠️ {{ data.compatibility.breakingChanges }}
      </div>
    </div>
  </div>

  <!-- 性能基准 -->
  <div v-if="data.performanceBenchmark" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">⚡ 性能基准</div>
    <div class="rounded bg-gray-50 p-3 text-sm dark:bg-gray-800/50">{{ data.performanceBenchmark }}</div>
  </div>
</template>
