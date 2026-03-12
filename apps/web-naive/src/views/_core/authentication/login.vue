<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { BasicOption } from '@vben/types';

import { computed, h, onMounted, onUnmounted, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message } from '#/adapter/naive';
import { getCaptchaApi, getEnvironmentApi } from '#/api/core/auth';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

// ==================== 组件引用 ====================

const loginComponentRef = ref<InstanceType<typeof AuthenticationLogin>>();

// ==================== 状态管理 ====================

const authStore = useAuthStore();

// 环境信息
const isPreview = ref(false); // 默认为非预览环境
const environment = ref('development');

// 验证码状态
const captchaId = ref('');
const captchaImage = ref('');
const captchaLoading = ref(false);
const captchaError = ref('');

// 获取环境信息
onMounted(async () => {
  try {
    const envInfo = await getEnvironmentApi();
    isPreview.value = envInfo.isPreview === true; // 确保是布尔值
    environment.value = envInfo.environment;

    // 非预览环境自动加载验证码
    if (!isPreview.value) {
      await fetchCaptcha();
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to get environment info:', error);
    }
    // 默认为非预览环境
    isPreview.value = false;
    // 尝试加载验证码
    await fetchCaptcha();
  }
});

// 组件卸载时清理（需求 9.4）
onUnmounted(() => {
  clearCaptchaState();
});

// ==================== 验证码相关函数 ====================

/**
 * 获取图片验证码
 * 需求 7.1: 显示错误消息并提供重试按钮
 * 需求 7.4: 记录错误到控制台
 */
async function fetchCaptcha() {
  captchaLoading.value = true;
  captchaError.value = '';

  try {
    const response = await getCaptchaApi();
    captchaId.value = response.captchaId;
    captchaImage.value = response.svg;
  } catch (error: any) {
    // 需求 7.4: 记录详细错误信息到控制台
    if (import.meta.env.DEV) {
      console.error('Failed to load captcha:', error);
    }

    // 需求 7.1, 7.3: 根据错误类型显示用户友好的错误消息
    if (
      error?.name === 'NetworkError' ||
      error?.code === 'ECONNABORTED' ||
      error?.message?.includes('Network')
    ) {
      captchaError.value = '网络连接失败，请检查网络后重试';
    } else if (
      error?.code === 'ETIMEDOUT' ||
      error?.message?.includes('timeout')
    ) {
      captchaError.value = '请求超时，请点击刷新重试';
    } else {
      captchaError.value = '验证码加载失败，请点击刷新重试';
    }
  } finally {
    captchaLoading.value = false;
  }
}

/**
 * 刷新验证码
 */
async function refreshCaptcha() {
  // 清空表单中的验证码字段（需求 5.5）
  const formApi = loginComponentRef.value?.getFormApi();
  if (formApi) {
    formApi.setFieldValue('captcha', '');
  }

  // 获取新的验证码
  await fetchCaptcha();
}

/**
 * 清除验证码状态
 */
function clearCaptchaState() {
  captchaId.value = '';
  captchaImage.value = '';
  captchaError.value = '';
}

const MOCK_USER_OPTIONS: BasicOption[] = [
  {
    label: '管理员',
    value: 'admin',
  },
  {
    label: '测试用户',
    value: 'test',
  },
];

const formSchema = computed((): VbenFormSchema[] => {
  // 用户名字段 - 预览环境包含 mock 依赖
  const usernameField: VbenFormSchema = {
    component: 'VbenInput',
    componentProps: {
      placeholder: $t('authentication.usernameTip'),
    },
    fieldName: 'username',
    label: $t('authentication.username'),
    rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
  };

  if (isPreview.value) {
    usernameField.dependencies = {
      trigger(values, form) {
        if (values.selectAccount) {
          const findUser = MOCK_USER_OPTIONS.find(
            (item) => item.value === values.selectAccount,
          );
          if (findUser) {
            form.setValues({
              password: '123456',
              username: findUser.value,
            });
          }
        }
      },
      triggerFields: ['selectAccount'],
    };
  }

  const baseSchema: VbenFormSchema[] = [
    // 仅在预览环境显示模拟账号选择器
    ...(isPreview.value
      ? [
          {
            component: 'VbenSelect',
            componentProps: {
              options: MOCK_USER_OPTIONS,
              placeholder: $t('authentication.selectAccount'),
            },
            fieldName: 'selectAccount',
            label: $t('authentication.selectAccount'),
            rules: z
              .string()
              .min(1, { message: $t('authentication.selectAccount') })
              .optional()
              .default('admin'),
          } satisfies VbenFormSchema,
        ]
      : []),
    usernameField,
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    // 在非预览环境中添加验证码字段到表单 schema
    ...(isPreview.value
      ? []
      : [
          {
            component: 'VbenInput',
            componentProps: {
              placeholder: '请输入验证码',
              class: 'captcha-input-field',
            },
            fieldName: 'captcha',
            label: '验证码',
            rules: z.string().min(1, { message: '请输入验证码' }),
            suffix: () => {
              if (captchaImage.value) {
                return h('img', {
                  src: captchaImage.value,
                  alt: '验证码',
                  title: '点击刷新验证码',
                  class: 'cursor-pointer ml-2 rounded block overflow-hidden',
                  style: 'width: 120px; height: 40px;',
                  onClick: (e: Event) => {
                    e.stopPropagation();
                    refreshCaptcha();
                  },
                });
              } else if (captchaError.value) {
                return h(
                  'div',
                  {
                    class:
                      'w-[120px] h-10 flex items-center justify-center text-xs text-red-500 cursor-pointer ml-2 rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950',
                    onClick: refreshCaptcha,
                  },
                  '点击重试',
                );
              } else {
                return h(
                  'div',
                  {
                    class:
                      'w-[120px] h-10 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 ml-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800',
                  },
                  '加载中...',
                );
              }
            },
          } satisfies VbenFormSchema,
        ]),
  ];

  return baseSchema;
});

// 处理登录提交
async function handleSubmit(values: Record<string, any>) {
  // 创建登录请求数据
  const loginData: Record<string, any> = {
    username: values.username,
    password: values.password,
  };

  // 预览环境：添加 isQuick 标记（需求 2.3, 4.3）
  if (isPreview.value) {
    loginData.isQuick = true;
  } else {
    // 生产环境：添加验证码数据（需求 4.3）
    loginData.captchaId = captchaId.value;
    loginData.captcha = values.captcha;
  }

  try {
    await authStore.authLogin(loginData);
    // 登录成功后清除验证码状态（需求 6.4）
    clearCaptchaState();
  } catch (error: any) {
    // 需求 7.4: 记录详细错误信息到控制台
    if (import.meta.env.DEV) {
      console.error('Login failed:', error);
    }

    // 解析后端错误码
    const errorCode = error?.response?.data?.code || error?.code;
    const errorMsg = error?.response?.data?.message || error?.message;

    switch (errorCode) {
      case 10_002: {
        // 账号已禁用
        message.error('账号已被禁用，请联系管理员');

        break;
      }
      case 10_003: {
        // 验证码错误
        message.error('验证码错误，请重新输入');
        await refreshCaptcha();

        break;
      }
      case 10_004: {
        // 密码错误，含剩余尝试次数
        message.error(errorMsg || '密码错误');
        await refreshCaptcha();

        break;
      }
      case 10_401: {
        // 账号锁定
        message.error(errorMsg || '账号已被锁定，请稍后重试');
        await refreshCaptcha();

        break;
      }
      default: {
        if (error?.code === 'INVALID_CAPTCHA') {
          message.error('验证码错误，请重新输入');
          await refreshCaptcha();
        } else if (error?.code === 'CAPTCHA_EXPIRED') {
          message.error('验证码已过期，请使用新的验证码');
          await refreshCaptcha();
        } else if (
          error?.name === 'NetworkError' ||
          error?.code === 'ECONNABORTED' ||
          error?.message?.includes('Network')
        ) {
          message.error('网络连接失败，请检查网络后重试');
        } else if (
          error?.code === 'ETIMEDOUT' ||
          error?.message?.includes('timeout')
        ) {
          message.error('请求超时，请稍后重试');
        }
      }
    }
    // 其他错误由全局错误处理器处理
  }
}
</script>

<template>
  <div class="relative">
    <!-- 预览环境提示 -->
    <div
      v-if="isPreview"
      class="absolute -top-12 left-0 right-0 flex items-center justify-center"
    >
      <div
        class="rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
      >
        <span class="mr-2">🔍</span>
        <span>预览环境 - 无需验证码，数据修改已禁用</span>
      </div>
    </div>

    <AuthenticationLogin
      ref="loginComponentRef"
      :form-schema="formSchema"
      :loading="authStore.loginLoading"
      @submit="handleSubmit"
    />
  </div>
</template>

<style scoped>
/* 验证码输入框样式调整 */
:deep(.captcha-input-field) {
  flex: 1;
}
</style>
