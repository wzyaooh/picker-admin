<script lang="ts" setup>
import { ref } from 'vue';
import { NCard, NMenu } from 'naive-ui';
import type { MenuOption } from 'naive-ui';
import { h } from 'vue';

import SecurityConfig from './SecurityConfig.vue';
import EmailConfig from './EmailConfig.vue';
import StorageConfig from './StorageConfig.vue';
import SmsConfig from './SmsConfig.vue';

defineOptions({ name: 'SystemToolsConfigPage' });

const activeKey = ref('security');

// 渲染图标
function renderIcon(icon: string) {
  return () => h('i', { class: `${icon} text-lg` });
}

const menuOptions: MenuOption[] = [
  {
    label: '安全配置',
    key: 'security',
    icon: renderIcon('lucide:shield-check'),
  },
  {
    label: '邮件配置',
    key: 'email',
    icon: renderIcon('lucide:mail'),
  },
  {
    label: '短信配置',
    key: 'sms',
    icon: renderIcon('lucide:message-square'),
  },
  {
    label: '存储配置',
    key: 'storage',
    icon: renderIcon('lucide:hard-drive'),
  },
  {
    label: '客户端配置',
    key: 'client',
    icon: renderIcon('lucide:monitor-smartphone'),
  },
];

function handleMenuSelect(key: string) {
  activeKey.value = key;
}
</script>

<template>
  <div class="flex h-full gap-4 p-4">
    <!-- 左侧菜单 -->
    <div class="w-52 flex-shrink-0">
      <NCard title="网站配置" :bordered="false" size="small" class="h-full">
        <NMenu
          v-model:value="activeKey"
          :options="menuOptions"
          @update:value="handleMenuSelect"
        />
      </NCard>
    </div>

    <!-- 右侧内容 -->
    <div class="flex-1 overflow-auto">
      <NCard :bordered="false" size="small">
        <SecurityConfig v-if="activeKey === 'security'" />
        <EmailConfig v-else-if="activeKey === 'email'" />
        <StorageConfig v-else-if="activeKey === 'storage'" />
        <SmsConfig v-else-if="activeKey === 'sms'" />
        
        <!-- 其他配置页面占位 -->
        <div v-else class="py-20 text-center text-gray-400">
          {{ activeKey }} 配置页面开发中...
        </div>
      </NCard>
    </div>
  </div>
</template>

<style scoped>
:deep(.n-menu-item-content) {
  padding: 12px 16px !important;
}

:deep(.n-menu-item-content__icon) {
  margin-right: 12px;
}
</style>
