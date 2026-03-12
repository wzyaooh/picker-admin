<script setup lang="ts">
import { NFormItem, NInputNumber, NSwitch } from 'naive-ui';

interface GenericConfig {
  maxLinks: number;
  maxImages: number;
  extractContent: boolean;
  extractLinks: boolean;
  extractImages: boolean;
}

defineProps<{
  config: GenericConfig;
}>();

defineEmits<{
  (e: 'update:config', config: GenericConfig): void;
}>();

const config = defineModel<GenericConfig>('config', { required: true });
</script>

<template>
  <div>
    <NFormItem label="最大链接数">
      <NInputNumber
        v-model:value="config.maxLinks"
        :min="1"
        :max="1000"
        class="w-full"
      />
    </NFormItem>

    <NFormItem label="最大图片数">
      <NInputNumber
        v-model:value="config.maxImages"
        :min="1"
        :max="1000"
        class="w-full"
      />
    </NFormItem>

    <NFormItem label="提取内容">
      <NSwitch v-model:value="config.extractContent" />
    </NFormItem>

    <NFormItem label="提取链接">
      <NSwitch v-model:value="config.extractLinks" />
    </NFormItem>

    <NFormItem label="提取图片">
      <NSwitch v-model:value="config.extractImages" />
    </NFormItem>
  </div>
</template>
