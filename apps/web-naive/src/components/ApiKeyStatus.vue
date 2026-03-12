<script lang="ts" setup>
import { ref } from 'vue';
import { NButton, NIcon, NTag, NTooltip, NSpace } from 'naive-ui';
import { IconifyIcon } from '@vben/icons';
import { useApiKeyStore } from '#/store';
import ApiKeyGlobalConfig from './ApiKeyGlobalConfig.vue';

const apiKeyStore = useApiKeyStore();
const showConfig = ref(false);

// 打开配置弹窗
function openConfig() {
  showConfig.value = true;
}

// 初始化时恢复配置
onMounted(() => {
  apiKeyStore.restoreFromStorage();
});
</script>

<template>
  <div class="api-key-status">
    <NTooltip>
      <template #trigger>
        <NButton
          size="small"
          :type="apiKeyStore.hasSelectedApiKey ? 'primary' : 'default'"
          @click="openConfig"
        >
          <template #icon>
            <NIcon>
              <IconifyIcon icon="lucide:key" />
            </NIcon>
          </template>
          
          <NSpace size="small" align="center">
            <span class="text-xs">API Key</span>
            <NTag
              v-if="apiKeyStore.hasSelectedApiKey"
              :type="apiKeyStore.apiKeyStatus.type as any"
              size="small"
            >
              {{ apiKeyStore.apiKeyStatus.text }}
            </NTag>
            <NTag
              v-else
              type="default"
              size="small"
            >
              未配置
            </NTag>
          </NSpace>
        </NButton>
      </template>
      
      <div v-if="apiKeyStore.hasSelectedApiKey">
        <div class="font-medium">{{ apiKeyStore.selectedApiKeyInfo?.name }}</div>
        <div class="text-xs text-gray-500 mt-1">
          前缀: {{ apiKeyStore.selectedApiKeyInfo?.keyPrefix }}...<br>
          权限: {{ apiKeyStore.selectedApiKeyInfo?.permissions.length }} 项<br>
          状态: {{ apiKeyStore.apiKeyStatus.text }}
        </div>
      </div>
      <div v-else>
        点击配置 API Key 以访问爬虫服务
      </div>
    </NTooltip>

    <!-- 配置弹窗 -->
    <ApiKeyGlobalConfig
      v-model:show="showConfig"
    />
  </div>
</template>

<style scoped>
.api-key-status {
  display: inline-block;
}
</style>
