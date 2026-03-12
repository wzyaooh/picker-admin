<script lang="ts" setup>
import { ref } from 'vue';
import { NCard, NInput, NSpace } from 'naive-ui';
import PasswordStrengthIndicator from './PasswordStrengthIndicator.vue';

defineOptions({ name: 'PasswordStrengthIndicatorExample' });

const password = ref('');

</script>

<template>
  <div class="p-4">
    <NCard title="密码强度指示器示例" :bordered="false">
      <NSpace vertical :size="24">
        <!-- 基础示例 -->
        <div>
          <div class="mb-2 text-sm font-medium">基础示例</div>
          <NInput
            v-model:value="password"
            type="password"
            placeholder="请输入密码"
            show-password-on="click"
          />
          <div class="mt-2">
            <PasswordStrengthIndicator :password="password" />
          </div>
        </div>

        <!-- 不显示提示 -->
        <div>
          <div class="mb-2 text-sm font-medium">不显示提示</div>
          <NInput
            v-model:value="password"
            type="password"
            placeholder="请输入密码"
            show-password-on="click"
          />
          <div class="mt-2">
            <PasswordStrengthIndicator :password="password" :show-tips="false" />
          </div>
        </div>

        <!-- 不显示文本 -->
        <div>
          <div class="mb-2 text-sm font-medium">不显示文本</div>
          <NInput
            v-model:value="password"
            type="password"
            placeholder="请输入密码"
            show-password-on="click"
          />
          <div class="mt-2">
            <PasswordStrengthIndicator :password="password" :show-text="false" />
          </div>
        </div>

        <!-- 测试用例 -->
        <div>
          <div class="mb-2 text-sm font-medium">测试用例</div>
          <NSpace vertical :size="12">
            <div>
              <div class="text-xs text-muted-foreground mb-1">弱密码: 123456</div>
              <PasswordStrengthIndicator password="123456" />
            </div>
            <div>
              <div class="text-xs text-muted-foreground mb-1">中等密码: Pass1234</div>
              <PasswordStrengthIndicator password="Pass1234" />
            </div>
            <div>
              <div class="text-xs text-muted-foreground mb-1">强密码: Pass123456</div>
              <PasswordStrengthIndicator password="Pass123456" />
            </div>
            <div>
              <div class="text-xs text-muted-foreground mb-1">很强密码: Pass@123456Abc</div>
              <PasswordStrengthIndicator password="Pass@123456Abc" />
            </div>
          </NSpace>
        </div>
      </NSpace>
    </NCard>
  </div>
</template>
