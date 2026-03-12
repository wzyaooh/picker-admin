<script lang="ts" setup>
interface Props {
  data: Record<string, any>;
}

defineProps<Props>();
</script>

<template>
  <!-- 配置指南 -->
  <div v-if="data.configGuide" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">⚙️ 配置指南</div>
    <div class="rounded border border-gray-200 p-3 dark:border-gray-700">
      <div v-if="data.configGuide.envVars?.length" class="mb-2">
        <div class="mb-1 text-xs text-gray-500">环境变量</div>
        <ul class="ml-4 list-disc text-sm">
          <li v-for="v in data.configGuide.envVars" :key="v">{{ v }}</li>
        </ul>
      </div>
      <div v-if="data.configGuide.configFiles?.length" class="mb-2">
        <div class="mb-1 text-xs text-gray-500">配置文件</div>
        <ul class="ml-4 list-disc text-sm">
          <li v-for="f in data.configGuide.configFiles" :key="f">{{ f }}</li>
        </ul>
      </div>
      <div v-if="data.configGuide.secrets" class="text-sm">
        <span class="text-gray-500">密钥配置：</span>{{ data.configGuide.secrets }}
      </div>
    </div>
  </div>

  <!-- 可伸缩性 -->
  <div v-if="data.scalability" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">📈 可伸缩性</div>
    <div class="rounded bg-gray-50 p-3 text-sm dark:bg-gray-800/50">{{ data.scalability }}</div>
  </div>
</template>
