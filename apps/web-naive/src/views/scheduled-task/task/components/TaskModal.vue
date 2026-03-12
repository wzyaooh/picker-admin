<script lang="ts" setup>
import type { ScheduledTaskApi } from '#/api/modules/scheduled-task';

import { computed, ref, watch } from 'vue';

import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NStep,
  NSteps,
} from 'naive-ui';

import { message } from '#/adapter/naive';

interface Props {
  show: boolean;
  mode?: 'create' | 'edit';
  initialValues?: Partial<ScheduledTaskApi.ScheduledTask>;
  handlers?: string[];
  taskGroupOptions: { label: string; value: string }[];
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'submit', data: ScheduledTaskApi.CreateParams): void;
}

defineOptions({ name: 'TaskModal' });

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
  initialValues: undefined,
  handlers: () => [],
});

const emit = defineEmits<Emits>();

const currentStep = ref(1);

const triggerTypeOptions = [
  { label: 'Cron 表达式', value: 'CRON' },
  { label: '固定间隔', value: 'INTERVAL' },
];

const taskTypeOptions = [
  { label: '本地方法', value: 'LOCAL' },
  { label: 'HTTP 请求', value: 'HTTP' },
];

const blockingStrategyOptions = [
  { label: '丢弃', value: 'DISCARD' },
  { label: '覆盖', value: 'COVER' },
  { label: '排队', value: 'QUEUE' },
];

const httpMethodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
];

const httpAuthTypeOptions = [
  { label: '无认证', value: 'NONE' },
  { label: 'Bearer Token', value: 'BEARER' },
  { label: 'Basic Auth', value: 'BASIC' },
  { label: 'API Key', value: 'API_KEY' },
];

const handlerOptions = computed(() =>
  (props.handlers || []).map((name) => ({ label: name, value: name })),
);

function getDefaultFormData() {
  return {
    name: '',
    taskGroup: null as null | string,
    description: '',
    triggerType: 'CRON' as 'CRON' | 'INTERVAL',
    cronExpression: '',
    intervalSeconds: 60,
    taskType: 'LOCAL' as 'HTTP' | 'LOCAL',
    handlerName: null as null | string,
    taskParams: '',
    httpMethod: 'POST' as 'DELETE' | 'GET' | 'POST' | 'PUT',
    httpHeaders: '',
    httpAuthType: 'NONE' as 'API_KEY' | 'BASIC' | 'BEARER' | 'NONE',
    httpAuthValue: '',
    blockingStrategy: 'DISCARD' as 'COVER' | 'DISCARD' | 'QUEUE',
    timeoutSeconds: 0,
    maxRetryCount: 0,
    retryInterval: 0,
  };
}

const formData = ref(getDefaultFormData());

watch(
  () => formData.value.taskType,
  () => {
    formData.value.handlerName = null;
  },
);

watch(
  () => props.show,
  (visible) => {
    if (!visible) return;
    currentStep.value = 1;
    if (props.mode === 'edit' && props.initialValues) {
      const v = props.initialValues;
      formData.value = {
        name: v.name ?? '',
        taskGroup: v.taskGroup ?? null,
        description: v.description ?? '',
        triggerType: v.triggerType ?? 'CRON',
        cronExpression: v.cronExpression ?? '',
        intervalSeconds: v.intervalSeconds ?? 60,
        taskType: v.taskType ?? 'LOCAL',
        handlerName: v.handlerName ?? null,
        taskParams: v.taskParams ?? '',
        httpMethod: v.httpMethod ?? 'POST',
        httpHeaders: v.httpHeaders ?? '',
        httpAuthType: v.httpAuthType ?? 'NONE',
        httpAuthValue: v.httpAuthValue ?? '',
        blockingStrategy: v.blockingStrategy ?? 'DISCARD',
        timeoutSeconds: v.timeoutSeconds ?? 0,
        maxRetryCount: v.maxRetryCount ?? 0,
        retryInterval: v.retryInterval ?? 0,
      };
    } else {
      formData.value = getDefaultFormData();
    }
  },
);

function validateStep(step: number): boolean {
  const f = formData.value;
  if (step === 1) {
    if (!f.name) {
      message.warning('请输入任务名称');
      return false;
    }
    if (!f.taskGroup) {
      message.warning('请选择任务组');
      return false;
    }
    return true;
  }
  if (step === 2) {
    if (f.triggerType === 'CRON' && !f.cronExpression) {
      message.warning('请输入 Cron 表达式');
      return false;
    }
    if (
      f.triggerType === 'INTERVAL' &&
      (!f.intervalSeconds || f.intervalSeconds <= 0)
    ) {
      message.warning('间隔时长必须大于 0');
      return false;
    }
    return true;
  }
  if (step === 3) {
    if (!f.handlerName) {
      message.warning('请输入执行器名称');
      return false;
    }
    return true;
  }
  return true;
}

function handleNext() {
  if (validateStep(currentStep.value)) {
    currentStep.value++;
  }
}

function handlePrev() {
  currentStep.value--;
}

function handleSubmit() {
  if (!validateStep(currentStep.value)) return;

  const f = formData.value;
  const data: ScheduledTaskApi.CreateParams = {
    name: f.name,
    taskGroup: f.taskGroup!,
    description: f.description || undefined,
    triggerType: f.triggerType,
    taskType: f.taskType,
    handlerName: f.handlerName!,
    taskParams: f.taskParams || undefined,
    blockingStrategy: f.blockingStrategy,
    timeoutSeconds: f.timeoutSeconds,
    maxRetryCount: f.maxRetryCount,
    retryInterval: f.retryInterval,
  };

  if (f.triggerType === 'CRON') {
    data.cronExpression = f.cronExpression;
  } else {
    data.intervalSeconds = f.intervalSeconds;
  }

  // HTTP 任务附加字段
  if (f.taskType === 'HTTP') {
    data.httpMethod = f.httpMethod;
    data.httpHeaders = f.httpHeaders || undefined;
    data.httpAuthType = f.httpAuthType;
    data.httpAuthValue = f.httpAuthValue || undefined;
  }

  emit('submit', data);
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="mode === 'create' ? '新增定时任务' : '编辑定时任务'"
    style="width: 640px"
    @close="emit('update:show', false)"
    @mask-click="emit('update:show', false)"
  >
    <NSteps :current="currentStep" class="mb-6">
      <NStep title="基础配置" />
      <NStep title="调度配置" />
      <NStep title="任务配置" />
      <NStep title="高级配置" />
    </NSteps>

    <NForm :model="formData" label-placement="left" :label-width="100">
      <!-- Step 1: 基础配置 -->
      <div v-show="currentStep === 1">
        <NFormItem label="任务名称" required>
          <NInput
            v-model:value="formData.name"
            :maxlength="64"
            placeholder="请输入任务名称"
          />
        </NFormItem>
        <NFormItem label="任务组" required>
          <NSelect
            v-model:value="formData.taskGroup"
            :options="taskGroupOptions"
            filterable
            placeholder="请选择任务组"
            tag
          />
        </NFormItem>
        <NFormItem label="描述">
          <NInput
            v-model:value="formData.description"
            :maxlength="200"
            :rows="2"
            placeholder="任务描述"
            type="textarea"
          />
        </NFormItem>
      </div>

      <!-- Step 2: 调度配置 -->
      <div v-show="currentStep === 2">
        <NFormItem label="触发类型" required>
          <NSelect
            v-model:value="formData.triggerType"
            :options="triggerTypeOptions"
          />
        </NFormItem>
        <NFormItem
          v-if="formData.triggerType === 'CRON'"
          label="Cron 表达式"
          required
        >
          <NInput
            v-model:value="formData.cronExpression"
            placeholder="例如: 0 0/5 * * * ?"
          />
        </NFormItem>
        <NFormItem
          v-if="formData.triggerType === 'INTERVAL'"
          label="间隔时长(秒)"
          required
        >
          <NInputNumber
            v-model:value="formData.intervalSeconds"
            :min="1"
            placeholder="间隔秒数"
            style="width: 100%"
          />
        </NFormItem>
      </div>

      <!-- Step 3: 任务配置 -->
      <div v-show="currentStep === 3">
        <NFormItem label="任务类型" required>
          <NSelect
            v-model:value="formData.taskType"
            :options="taskTypeOptions"
          />
        </NFormItem>
        <NFormItem label="执行器名称" required>
          <NSelect
            v-if="formData.taskType === 'LOCAL'"
            v-model:value="formData.handlerName"
            :options="handlerOptions"
            placeholder="请选择 Handler"
          />
          <NInput
            v-else
            v-model:value="formData.handlerName"
            placeholder="请输入 HTTP URL"
          />
        </NFormItem>

        <!-- HTTP 专属配置 -->
        <template v-if="formData.taskType === 'HTTP'">
          <NFormItem label="请求方法">
            <NSelect
              v-model:value="formData.httpMethod"
              :options="httpMethodOptions"
            />
          </NFormItem>
          <NFormItem label="认证方式">
            <NSelect
              v-model:value="formData.httpAuthType"
              :options="httpAuthTypeOptions"
            />
          </NFormItem>
          <NFormItem
            v-if="formData.httpAuthType !== 'NONE'"
            label="认证值"
          >
            <NInput
              v-model:value="formData.httpAuthValue"
              :placeholder="
                formData.httpAuthType === 'BEARER'
                  ? '输入 Token'
                  : formData.httpAuthType === 'BASIC'
                    ? '输入 Base64 编码的 user:password'
                    : '输入 API Key'
              "
              type="password"
              show-password-on="click"
            />
          </NFormItem>
          <NFormItem label="自定义请求头">
            <NInput
              v-model:value="formData.httpHeaders"
              :rows="3"
              placeholder='JSON 格式，例如: {"X-Custom": "value"}'
              type="textarea"
            />
          </NFormItem>
        </template>

        <NFormItem label="任务参数">
          <NInput
            v-model:value="formData.taskParams"
            :rows="3"
            placeholder="JSON 格式参数"
            type="textarea"
          />
        </NFormItem>
      </div>

      <!-- Step 4: 高级配置 -->
      <div v-show="currentStep === 4">
        <NFormItem label="阻塞策略">
          <NSelect
            v-model:value="formData.blockingStrategy"
            :options="blockingStrategyOptions"
          />
        </NFormItem>
        <NFormItem label="超时时间(秒)">
          <NInputNumber
            v-model:value="formData.timeoutSeconds"
            :min="0"
            placeholder="0 表示不限制"
            style="width: 100%"
          />
        </NFormItem>
        <NFormItem label="最大重试次数">
          <NInputNumber
            v-model:value="formData.maxRetryCount"
            :max="10"
            :min="0"
            style="width: 100%"
          />
        </NFormItem>
        <NFormItem label="重试间隔(秒)">
          <NInputNumber
            v-model:value="formData.retryInterval"
            :min="0"
            style="width: 100%"
          />
        </NFormItem>
      </div>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="emit('update:show', false)">取消</NButton>
        <NButton v-if="currentStep > 1" @click="handlePrev">上一步</NButton>
        <NButton v-if="currentStep < 4" type="primary" @click="handleNext">
          下一步
        </NButton>
        <NButton v-if="currentStep === 4" type="primary" @click="handleSubmit">
          {{ mode === 'create' ? '创建' : '更新' }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
