<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NSpin,
  NSwitch,
} from 'naive-ui';

import { dialog, message } from '#/adapter/naive';
import {
  getEmailConfigApi,
  resetEmailConfigApi,
  updateEmailConfigApi,
} from '#/api';

defineOptions({ name: 'EmailConfig' });

const formData = ref({
  protocol: 'SMTP',
  host: '',
  port: 465,
  username: '',
  password: '',
  useSsl: true,
  sslPort: 465,
});

const loading = ref(false);
const pageLoading = ref(false);

const protocolOptions = [
  { label: 'SMTP', value: 'SMTP' },
  { label: 'IMAP', value: 'IMAP' },
  { label: 'POP3', value: 'POP3' },
];

async function loadConfig() {
  pageLoading.value = true;
  try {
    const config = await getEmailConfigApi();
    formData.value = config;
  } catch {
    message.error('加载邮件配置失败');
  } finally {
    pageLoading.value = false;
  }
}

async function handleSave() {
  if (!formData.value.host) {
    message.warning('请输入服务器地址');
    return;
  }

  loading.value = true;
  try {
    const config = await updateEmailConfigApi(formData.value);
    formData.value = config;
    message.success('保存成功');
  } catch {
    // 错误已被拦截器处理
  } finally {
    loading.value = false;
  }
}

function handleReset() {
  dialog.warning({
    title: '确认恢复默认',
    content: '确定要恢复为默认配置吗？此操作不可撤销。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      loading.value = true;
      try {
        const config = await resetEmailConfigApi();
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

onMounted(() => {
  loadConfig();
});
</script>

<template>
  <NSpin :show="pageLoading">
    <div class="max-w-2xl">
      <NForm :model="formData" label-placement="left" label-width="140">
        <NFormItem label="邮件协议">
          <NSelect
            v-model:value="formData.protocol"
            :options="protocolOptions"
            placeholder="选择邮件协议"
          />
          <div class="ml-3 text-sm text-gray-500">邮件发送协议类型</div>
        </NFormItem>

        <NFormItem label="服务器地址">
          <NInput v-model:value="formData.host" placeholder="smtp.126.com" />
          <div class="ml-3 text-sm text-gray-500">邮件服务器地址</div>
        </NFormItem>

        <NFormItem label="服务器端口">
          <NInputNumber
            v-model:value="formData.port"
            :min="1"
            :max="65535"
            class="w-full"
          />
          <div class="ml-3 text-sm text-gray-500">邮件服务器连接端口</div>
        </NFormItem>

        <NFormItem label="邮箱账号">
          <NInput
            v-model:value="formData.username"
            placeholder="user@example.com"
          />
          <div class="ml-3 text-sm text-gray-500">发件人邮箱地址</div>
        </NFormItem>

        <NFormItem label="邮箱密码">
          <NInput
            v-model:value="formData.password"
            type="password"
            placeholder="服务器授权密码/密钥"
            show-password-on="click"
          />
          <div class="ml-3 text-sm text-gray-500">
            服务器授权密码或密钥用密码
          </div>
        </NFormItem>

        <NFormItem label="启用SSL加密">
          <NSwitch v-model:value="formData.useSsl" />
          <div class="ml-3 text-sm text-gray-500">是否启用SSL/TLS加密连接</div>
        </NFormItem>

        <NFormItem label="SSL端口号">
          <NInputNumber
            v-model:value="formData.sslPort"
            :min="1"
            :max="65535"
            :disabled="!formData.useSsl"
            class="w-full"
          />
          <div class="ml-3 text-sm text-gray-500">
            SSL加密连接的端口号 (通常与主端口一致)
          </div>
        </NFormItem>

        <NFormItem :show-label="false">
          <NSpace>
            <NButton type="primary" :loading="loading" @click="handleSave">
              修改
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
