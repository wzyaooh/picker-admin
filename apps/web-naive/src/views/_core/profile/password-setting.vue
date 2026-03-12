<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';

import { computed, h, onMounted, ref } from 'vue';

import { ProfilePasswordSetting, z } from '@vben/common-ui';

import { message } from '#/adapter/naive';
import { getSecurityConfigApi } from '#/api';
import { changePasswordApi } from '#/api/core/auth';
import PasswordStrengthIndicator from '#/components/PasswordStrengthIndicator.vue';
import { useAuthStore } from '#/store';

const authStore = useAuthStore();
const submitting = ref(false);
const newPassword = ref('');

// 密码策略
const passwordPolicy = ref<{
  passwordMaxLength: number;
  passwordMinLength: number;
  passwordRequireLowercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSpecial: boolean;
  passwordRequireUppercase: boolean;
}>({
  passwordMaxLength: 128,
  passwordMinLength: 6,
  passwordRequireLowercase: false,
  passwordRequireNumber: false,
  passwordRequireSpecial: false,
  passwordRequireUppercase: false,
});

onMounted(async () => {
  try {
    const config = await getSecurityConfigApi();
    passwordPolicy.value = config;
  } catch {
    // 获取策略失败时使用默认值
  }
});

const formSchema = computed((): VbenFormSchema[] => {
  const p = passwordPolicy.value;
  const minLen = p.passwordMinLength || 6;

  return [
    {
      fieldName: 'oldPassword',
      label: '旧密码',
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: '请输入旧密码',
      },
      rules: z.string().min(1, { message: '请输入旧密码' }),
    },
    {
      fieldName: 'newPassword',
      label: '新密码',
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: '请输入新密码',
        onChange: (val: string) => {
          newPassword.value = val || '';
        },
      },
      rules: z.string().min(minLen, { message: `密码至少${minLen}位` }),
      suffix: () =>
        h(PasswordStrengthIndicator, {
          password: newPassword.value,
          showTips: true,
          showText: true,
        }),
    },
    {
      fieldName: 'confirmPassword',
      label: '确认密码',
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: '请再次输入新密码',
      },
      dependencies: {
        rules(values) {
          const { newPassword: np } = values;
          return z
            .string({ required_error: '请再次输入新密码' })
            .min(1, { message: '请再次输入新密码' })
            .refine((value) => value === np, {
              message: '两次输入的密码不一致',
            });
        },
        triggerFields: ['newPassword'],
      },
    },
  ];
});

async function handleSubmit(values: Record<string, any>) {
  if (submitting.value) return;
  submitting.value = true;

  try {
    await changePasswordApi({
      oldPassword: values.oldPassword,
      newPassword: values.newPassword,
    });
    message.success('密码修改成功，请重新登录');
    await authStore.logout(false);
  } catch (error: any) {
    const errorMsg = error?.response?.data?.message || error?.message;
    if (errorMsg) {
      message.error(errorMsg);
    }
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <ProfilePasswordSetting
    class="w-1/3"
    :form-schema="formSchema"
    @submit="handleSubmit"
  />
</template>
