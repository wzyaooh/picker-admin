<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import type { AuthApi } from '#/api/core/auth';

import { computed, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationRegister, z } from '@vben/common-ui';
import { LOGIN_PATH } from '@vben/constants';
import { $t } from '@vben/locales';

import { message } from '#/adapter/naive';
import { getPasswordPolicyApi, registerApi } from '#/api/core/auth';

defineOptions({ name: 'Register' });

const router = useRouter();
const loading = ref(false);

const DEFAULT_POLICY: AuthApi.PublicPasswordPolicy = {
  minLength: 8,
  maxLength: 20,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
};

const passwordPolicy = ref<AuthApi.PublicPasswordPolicy>({ ...DEFAULT_POLICY });

onMounted(async () => {
  try {
    const policy = await getPasswordPolicyApi();
    passwordPolicy.value = policy;
  } catch {
    passwordPolicy.value = { ...DEFAULT_POLICY };
  }
});

function buildPasswordRules(policy: AuthApi.PublicPasswordPolicy) {
  const base = z
    .string()
    .min(policy.minLength, { message: `密码至少 ${policy.minLength} 位` })
    .max(policy.maxLength, { message: `密码最多 ${policy.maxLength} 位` });

  return base.superRefine((v, ctx) => {
    if (policy.requireUppercase && !/[A-Z]/.test(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '密码必须包含大写字母',
      });
    }
    if (policy.requireLowercase && !/[a-z]/.test(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '密码必须包含小写字母',
      });
    }
    if (policy.requireNumber && !/\d/.test(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '密码必须包含数字',
      });
    }
    if (policy.requireSpecial && !/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '密码必须包含特殊字符',
      });
    }
  });
}

function buildPolicyHintText(policy: AuthApi.PublicPasswordPolicy): string {
  const hints: string[] = [`${policy.minLength}-${policy.maxLength} 位`];
  if (policy.requireUppercase) hints.push('大写字母');
  if (policy.requireLowercase) hints.push('小写字母');
  if (policy.requireNumber) hints.push('数字');
  if (policy.requireSpecial) hints.push('特殊字符');

  return hints.length > 1
    ? `密码要求：${hints[0]}，须包含${hints.slice(1).join('、')}`
    : `密码要求：${hints[0]}`;
}

const formSchema = computed((): VbenFormSchema[] => {
  const policy = passwordPolicy.value;

  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      renderComponentContent() {
        return {
          strengthText: () => buildPolicyHintText(policy),
        };
      },
      rules: buildPasswordRules(policy),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.confirmPassword'),
      },
      dependencies: {
        rules(values) {
          const { password } = values;
          return z
            .string({ required_error: $t('authentication.passwordTip') })
            .min(1, { message: $t('authentication.passwordTip') })
            .refine((value) => value === password, {
              message: $t('authentication.confirmPasswordTip'),
            });
        },
        triggerFields: ['password'],
      },
      fieldName: 'confirmPassword',
      label: $t('authentication.confirmPassword'),
    },
    {
      component: 'VbenCheckbox',
      fieldName: 'agreePolicy',
      renderComponentContent: () => ({
        default: () =>
          h('span', [
            $t('authentication.agree'),
            h(
              'a',
              {
                class: 'vben-link ml-1',
                href: '',
              },
              `${$t('authentication.privacyPolicy')} & ${$t('authentication.terms')}`,
            ),
          ]),
      }),
      rules: z.boolean().refine((value) => !!value, {
        message: $t('authentication.agreeTip'),
      }),
    },
  ];
});

async function handleSubmit(value: Recordable<any>) {
  loading.value = true;
  try {
    await registerApi({ username: value.username, password: value.password });
    message.success('注册成功');
    setTimeout(() => {
      router.push(LOGIN_PATH);
    }, 2000);
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.message ||
      '注册失败，请稍后重试';
    message.error(errorMsg);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthenticationRegister
    :form-schema="formSchema"
    :loading="loading"
    @submit="handleSubmit"
  />
</template>
