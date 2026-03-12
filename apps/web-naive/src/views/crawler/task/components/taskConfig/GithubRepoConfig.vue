<script setup lang="ts">
import { NFormItem, NInput, NInputNumber } from 'naive-ui';

interface RepoConfig {
  githubToken: string;
  maxContributors: number;
  maxCommits: number;
}

defineProps<{
  config: RepoConfig;
}>();

defineEmits<{
  (e: 'update:config', config: RepoConfig): void;
}>();

const config = defineModel<RepoConfig>('config', { required: true });
</script>

<template>
  <div>
    <NFormItem label="GitHub Token">
      <NInput
        v-model:value="config.githubToken"
        placeholder="可选，提高 API 速率限制"
        type="password"
        show-password-on="click"
      />
    </NFormItem>

    <NFormItem label="贡献者数量">
      <NInputNumber
        v-model:value="config.maxContributors"
        :min="1"
        :max="100"
        class="w-full"
      />
    </NFormItem>

    <NFormItem label="提交记录数">
      <NInputNumber
        v-model:value="config.maxCommits"
        :min="1"
        :max="100"
        class="w-full"
      />
    </NFormItem>
  </div>
</template>
