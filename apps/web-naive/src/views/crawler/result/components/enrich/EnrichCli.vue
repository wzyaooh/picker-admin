<script lang="ts" setup>
import { NSpace, NTag } from 'naive-ui';

interface Props {
  data: Record<string, any>;
}

defineProps<Props>();
</script>

<template>
  <!-- 命令用法 -->
  <div v-if="data.cliUsage" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">⌨️ 命令用法</div>
    <div class="rounded border border-cyan-200 p-3 dark:border-cyan-800">
      <div v-if="data.cliUsage.basicCommand" class="mb-2">
        <pre class="rounded bg-gray-900 p-2 text-xs text-green-400"><code>{{ data.cliUsage.basicCommand }}</code></pre>
      </div>
      <div v-if="data.cliUsage.subCommands?.length" class="mb-2">
        <div class="mb-1 text-xs text-gray-500">子命令</div>
        <ul class="ml-4 list-disc text-sm">
          <li v-for="cmd in data.cliUsage.subCommands" :key="cmd">{{ cmd }}</li>
        </ul>
      </div>
      <div v-if="data.cliUsage.commonFlags?.length" class="mb-2">
        <div class="mb-1 text-xs text-gray-500">常用参数</div>
        <ul class="ml-4 list-disc text-sm">
          <li v-for="flag in data.cliUsage.commonFlags" :key="flag">{{ flag }}</li>
        </ul>
      </div>
      <div v-if="data.cliUsage.pipelineExamples?.length" class="mb-2">
        <div class="mb-1 text-xs text-gray-500">管道示例</div>
        <pre v-for="ex in data.cliUsage.pipelineExamples" :key="ex" class="mb-1 rounded bg-gray-900 p-2 text-xs text-green-400"><code>{{ ex }}</code></pre>
      </div>
      <div v-if="data.cliUsage.configFile" class="mb-2 text-sm">
        <span class="text-gray-500">配置文件：</span>{{ data.cliUsage.configFile }}
      </div>
      <div v-if="data.cliUsage.outputFormats" class="text-sm">
        <span class="text-gray-500">输出格式：</span>{{ data.cliUsage.outputFormats }}
      </div>
    </div>
  </div>

  <!-- 平台支持 -->
  <div v-if="data.platformSupport" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">💻 平台支持</div>
    <NSpace :size="6">
      <NTag v-for="os in (data.platformSupport.os || [])" :key="os" size="small" :bordered="false">{{ os }}</NTag>
      <NTag v-for="pm in (data.platformSupport.packageManagers || [])" :key="pm" size="small" type="info" :bordered="false">{{ pm }}</NTag>
    </NSpace>
  </div>

  <!-- 安装方式（CLI 共享） -->
  <div v-if="data.installMethods?.length" class="mb-4">
    <div class="mb-1 text-xs text-gray-400">📥 安装方式</div>
    <div class="space-y-1">
      <pre v-for="m in data.installMethods" :key="m" class="rounded bg-gray-900 p-2 text-xs text-green-400"><code>{{ m }}</code></pre>
    </div>
  </div>
</template>
