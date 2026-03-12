<script lang="ts" setup>
import { computed } from 'vue';
import { NProgress, NSpace, NText } from 'naive-ui';
import { usePasswordStrength } from '#/composables/use-password-strength';

interface Props {
  /** 密码值 */
  password: string;
  /** 是否显示提示 */
  showTips?: boolean;
  /** 是否显示文本 */
  showText?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showTips: true,
  showText: true,
});

// 使用密码强度计算
const { score, text, color, tips } = usePasswordStrength(() => props.password);

// 进度条状态
const status = computed(() => {
  const level = score.value;
  if (level < 40) return 'error';
  if (level < 60) return 'warning';
  if (level < 80) return 'success';
  return 'info';
});

// 进度条百分比
const percentage = computed(() => score.value);

</script>

<template>
  <div class="password-strength-indicator">
    <!-- 强度进度条 -->
    <div class="flex items-center gap-2">
      <NProgress
        type="line"
        :percentage="percentage"
        :status="status"
        :color="color"
        :show-indicator="false"
        :height="6"
        class="flex-1"
      />
      <NText v-if="showText" :style="{ color }" class="text-sm font-medium min-w-12">
        {{ text }}
      </NText>
    </div>

    <!-- 提示信息 -->
    <div v-if="showTips && password" class="mt-2">
      <NSpace vertical :size="4">
        <NText
          v-for="(tip, index) in tips"
          :key="index"
          depth="3"
          class="text-xs"
        >
          • {{ tip }}
        </NText>
      </NSpace>
    </div>
  </div>
</template>

<style scoped>
.password-strength-indicator {
  width: 100%;
}
</style>
