<script lang="ts" setup>
import type { SecurityConfigApi } from '#/api';

import { onMounted, ref } from 'vue';

import {
  NButton,
  NForm,
  NFormItem,
  NInputNumber,
  NSpace,
  NSpin,
  NSwitch,
} from 'naive-ui';

import { dialog, message } from '#/adapter/naive';
import {
  getSecurityConfigApi,
  resetSecurityConfigApi,
  updateSecurityConfigApi,
} from '#/api';

defineOptions({ name: 'SecurityConfig' });

// 表单数据
const formData = ref<SecurityConfigApi.SecurityConfig>({
  // 密码策略
  passwordMinLength: 8,
  passwordMaxLength: 32,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: false,
  // 账号锁定
  maxLoginAttempts: 5,
  lockoutDuration: 30,
  lockoutEnabled: true,
  // 密码有效期
  passwordExpireDays: 0,
  passwordExpiryEnabled: false,
  passwordExpiryWarningDays: 7,
  // 历史密码
  passwordHistoryCount: 3,
  passwordHistoryEnabled: true,
  // 审计日志
  auditEnabled: true,
  auditSaveReqBody: false,
  auditRetentionDays: 90,
  auditAutoCleanup: true,
});

const loading = ref(false);
const pageLoading = ref(false);

// 加载配置
async function loadConfig() {
  pageLoading.value = true;
  try {
    const config = await getSecurityConfigApi();
    formData.value = config;
  } catch {
    message.error('加载配置失败');
  } finally {
    pageLoading.value = false;
  }
}

// 验证表单
function validateForm(): boolean {
  // 验证密码长度
  if (formData.value.passwordMinLength > formData.value.passwordMaxLength) {
    message.warning('密码最小长度不能大于最大长度');
    return false;
  }

  // 验证账号锁定配置
  if (formData.value.lockoutEnabled) {
    if (
      formData.value.maxLoginAttempts < 3 ||
      formData.value.maxLoginAttempts > 10
    ) {
      message.warning('最大登录失败次数必须在 3-10 之间');
      return false;
    }
    if (
      formData.value.lockoutDuration < 5 ||
      formData.value.lockoutDuration > 1440
    ) {
      message.warning('账号锁定时长必须在 5-1440 分钟之间');
      return false;
    }
  }

  // 验证密码有效期
  if (formData.value.passwordExpiryEnabled) {
    if (
      formData.value.passwordExpireDays < 1 ||
      formData.value.passwordExpireDays > 365
    ) {
      message.warning('密码有效天数必须在 1-365 之间');
      return false;
    }
    // 验证过期提醒天数
    const warningDays = formData.value.passwordExpiryWarningDays;
    if (warningDays < 1 || warningDays > 30) {
      message.warning('过期提醒天数必须在 1-30 之间');
      return false;
    }
    if (warningDays > formData.value.passwordExpireDays) {
      message.warning('过期提醒天数不能超过密码有效天数');
      return false;
    }
  }

  // 验证历史密码
  if (
    formData.value.passwordHistoryEnabled &&
    (formData.value.passwordHistoryCount < 1 ||
      formData.value.passwordHistoryCount > 10)
  ) {
    message.warning('历史密码记录数必须在 1-10 之间');
    return false;
  }

  // 验证审计日志配置
  if (
    formData.value.auditEnabled &&
    (formData.value.auditRetentionDays < 7 ||
      formData.value.auditRetentionDays > 365)
  ) {
    message.warning('日志保留天数必须在 7-365 之间');
    return false;
  }

  return true;
}

// 保存配置
async function handleSave() {
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  try {
    await updateSecurityConfigApi(formData.value);
    message.success('保存成功');
    await loadConfig();
  } catch {
    // 错误已被拦截器处理
  } finally {
    loading.value = false;
  }
}

// 恢复默认
function handleReset() {
  dialog.warning({
    title: '确认恢复默认',
    content: '确定要恢复为默认配置吗？此操作不可撤销。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      loading.value = true;
      try {
        const config = await resetSecurityConfigApi();
        formData.value = config;
        message.success('已恢复默认配置');
      } catch {
        // 错误已被拦截器处理
      } finally {
        loading.value = false;
      }
    },
  });
}

// 页面加载时获取配置
onMounted(() => {
  loadConfig();
});
</script>

<template>
  <NSpin :show="pageLoading">
    <div class="max-w-3xl">
      <NForm :model="formData" label-placement="left" label-width="180">
        <!-- 密码策略 -->
        <div class="mb-6">
          <div class="mb-4 text-base font-semibold">密码策略</div>

          <NFormItem label="密码最小长度">
            <NInputNumber
              v-model:value="formData.passwordMinLength"
              :min="6"
              :max="32"
              class="w-full"
            >
              <template #suffix>字符</template>
            </NInputNumber>
            <div class="ml-3 text-sm text-gray-500">
              密码最少包含的字符数 (6-32字符)
            </div>
          </NFormItem>

          <NFormItem label="密码最大长度">
            <NInputNumber
              v-model:value="formData.passwordMaxLength"
              :min="8"
              :max="128"
              class="w-full"
            >
              <template #suffix>字符</template>
            </NInputNumber>
            <div class="ml-3 text-sm text-gray-500">
              密码最多包含的字符数 (8-128字符)
            </div>
          </NFormItem>

          <NFormItem label="必须包含大写字母">
            <NSwitch v-model:value="formData.passwordRequireUppercase" />
            <div class="ml-3 text-sm text-gray-500">
              密码必须包含至少一个大写字母 (A-Z)
            </div>
          </NFormItem>

          <NFormItem label="必须包含小写字母">
            <NSwitch v-model:value="formData.passwordRequireLowercase" />
            <div class="ml-3 text-sm text-gray-500">
              密码必须包含至少一个小写字母 (a-z)
            </div>
          </NFormItem>

          <NFormItem label="必须包含数字">
            <NSwitch v-model:value="formData.passwordRequireNumber" />
            <div class="ml-3 text-sm text-gray-500">
              密码必须包含至少一个数字 (0-9)
            </div>
          </NFormItem>

          <NFormItem label="必须包含特殊字符">
            <NSwitch v-model:value="formData.passwordRequireSpecial" />
            <div class="ml-3 text-sm text-gray-500">
              密码必须包含至少一个特殊字符 (!@#$%^&*)
            </div>
          </NFormItem>
        </div>

        <!-- 账号锁定策略 -->
        <div class="mb-6">
          <div class="mb-4 text-base font-semibold">账号锁定策略</div>

          <NFormItem label="启用账号锁定">
            <NSwitch v-model:value="formData.lockoutEnabled" />
            <div class="ml-3 text-sm text-gray-500">
              启用后，多次登录失败将锁定账号
            </div>
          </NFormItem>

          <NFormItem label="最大登录失败次数">
            <NInputNumber
              v-model:value="formData.maxLoginAttempts"
              :min="3"
              :max="10"
              :disabled="!formData.lockoutEnabled"
              class="w-full"
            >
              <template #suffix>次</template>
            </NInputNumber>
            <div class="ml-3 text-sm text-gray-500">
              连续登录失败达到此次数后锁定账号 (3-10次)
            </div>
          </NFormItem>

          <NFormItem label="账号锁定时长">
            <NInputNumber
              v-model:value="formData.lockoutDuration"
              :min="5"
              :max="1440"
              :disabled="!formData.lockoutEnabled"
              class="w-full"
            >
              <template #suffix>分钟</template>
            </NInputNumber>
            <div class="ml-3 text-sm text-gray-500">
              账号被锁定的时长 (5-1440分钟，即24小时)
            </div>
          </NFormItem>
        </div>

        <!-- 密码有效期 -->
        <div class="mb-6">
          <div class="mb-4 text-base font-semibold">密码有效期</div>

          <NFormItem label="启用密码过期">
            <NSwitch v-model:value="formData.passwordExpiryEnabled" />
            <div class="ml-3 text-sm text-gray-500">
              启用后，密码将在指定天数后过期
            </div>
          </NFormItem>

          <NFormItem label="密码有效天数">
            <NInputNumber
              v-model:value="formData.passwordExpireDays"
              :min="0"
              :max="365"
              :disabled="!formData.passwordExpiryEnabled"
              class="w-full"
            >
              <template #suffix>天</template>
            </NInputNumber>
            <div class="ml-3 text-sm text-gray-500">
              密码的有效期限 (0-365天，0表示永不过期)
            </div>
          </NFormItem>

          <NFormItem label="过期提醒天数">
            <NInputNumber
              v-model:value="formData.passwordExpiryWarningDays"
              :min="1"
              :max="30"
              :disabled="!formData.passwordExpiryEnabled"
              class="w-full"
            >
              <template #suffix>天</template>
            </NInputNumber>
            <div class="ml-3 text-sm text-gray-500">
              密码过期前提前提醒的天数 (1-30天，不超过有效天数)
            </div>
          </NFormItem>
        </div>

        <!-- 历史密码 -->
        <div class="mb-6">
          <div class="mb-4 text-base font-semibold">历史密码限制</div>

          <NFormItem label="启用历史密码检查">
            <NSwitch v-model:value="formData.passwordHistoryEnabled" />
            <div class="ml-3 text-sm text-gray-500">
              防止用户重复使用最近的密码
            </div>
          </NFormItem>

          <NFormItem label="历史密码记录数">
            <NInputNumber
              v-model:value="formData.passwordHistoryCount"
              :min="0"
              :max="10"
              :disabled="!formData.passwordHistoryEnabled"
              class="w-full"
            >
              <template #suffix>次</template>
            </NInputNumber>
            <div class="ml-3 text-sm text-gray-500">
              禁止用户重复使用最近 N 次的密码 (0-10次)
            </div>
          </NFormItem>
        </div>

        <!-- 审计日志配置 -->
        <div class="mb-6">
          <div class="mb-4 text-base font-semibold">审计日志配置</div>

          <NFormItem label="启用审计日志">
            <NSwitch v-model:value="formData.auditEnabled" />
            <div class="ml-3 text-sm text-gray-500">
              启用后，系统将记录所有操作日志
            </div>
          </NFormItem>

          <NFormItem label="记录请求体">
            <NSwitch
              v-model:value="formData.auditSaveReqBody"
              :disabled="!formData.auditEnabled"
            />
            <div class="ml-3 text-sm text-gray-500">
              记录 API 请求的请求体内容（敏感信息会自动脱敏）
            </div>
          </NFormItem>

          <NFormItem label="日志保留天数">
            <NInputNumber
              v-model:value="formData.auditRetentionDays"
              :min="7"
              :max="365"
              :disabled="!formData.auditEnabled"
              class="w-full"
            >
              <template #suffix>天</template>
            </NInputNumber>
            <div class="ml-3 text-sm text-gray-500">
              审计日志的保留期限 (7-365天)
            </div>
          </NFormItem>

          <NFormItem label="自动清理过期日志">
            <NSwitch
              v-model:value="formData.auditAutoCleanup"
              :disabled="!formData.auditEnabled"
            />
            <div class="ml-3 text-sm text-gray-500">
              启用后，系统将自动清理超过保留期限的日志
            </div>
          </NFormItem>
        </div>

        <!-- 操作按钮 -->
        <NFormItem :show-label="false">
          <NSpace>
            <NButton type="primary" :loading="loading" @click="handleSave">
              保存配置
            </NButton>
            <NButton :loading="loading" @click="handleReset">
              恢复默认
            </NButton>
          </NSpace>
        </NFormItem>
      </NForm>
    </div>
  </NSpin>
</template>
