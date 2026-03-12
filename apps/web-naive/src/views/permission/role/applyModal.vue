<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui';

import { computed, reactive, ref, watch } from 'vue';

import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSwitch,
} from 'naive-ui';

type FormValues = {
  code: string;
  description: string;
  enabled: boolean;
  name: string;
};

interface Props {
  existingCodes: string[];
  initialValues?: Partial<FormValues>;
  mode: 'create' | 'edit';
  originalCode?: string;
}

const props = withDefaults(defineProps<Props>(), {
  existingCodes: () => [],
  initialValues: () => ({}),
  originalCode: undefined,
});

const emit = defineEmits<{ submit: [FormValues] }>();

const show = defineModel<boolean>('show', { required: true });

const formRef = ref<FormInst | null>(null);

const formModel = reactive<FormValues>({
  code: '',
  description: '',
  enabled: true,
  name: '',
});

const title = computed(() => (props.mode === 'create' ? '新增角色' : '编辑角色'));

const rules = computed((): FormRules => {
  return {
    code: [
      {
        required: true,
        message: '请输入角色编码',
        trigger: ['input', 'blur'],
      },
      {
        validator: (_rule, value: string) => {
          const v = (value || '').trim();
          if (!v) return true;

          const lower = v.toLowerCase();
          const original = (props.originalCode || '').trim().toLowerCase();
          if (props.mode === 'edit' && original && lower === original) {
            return true;
          }

          const exists = props.existingCodes.some(
            (c) => (c || '').trim().toLowerCase() === lower,
          );
          return exists ? new Error('角色编码已存在') : true;
        },
        trigger: ['input', 'blur'],
      },
    ],
    name: [
      {
        required: true,
        message: '请输入角色名称',
        trigger: ['input', 'blur'],
      },
    ],
  };
});

function applyInitialValues() {
  formModel.name = (props.initialValues?.name ?? '').toString();
  formModel.code = (props.initialValues?.code ?? '').toString();
  formModel.enabled = Boolean(props.initialValues?.enabled ?? true);
  formModel.description = (props.initialValues?.description ?? '').toString();
}

watch(
  () => show.value,
  (val) => {
    if (!val) {
      return;
    }
    applyInitialValues();
    formRef.value?.restoreValidation();
  },
);

watch(
  () => props.initialValues,
  () => {
    if (show.value) {
      applyInitialValues();
      formRef.value?.restoreValidation();
    }
  },
  { deep: true },
);

async function handleSubmit() {
  const form = formRef.value;
  if (!form) {
    return;
  }

  await form.validate();

  emit('submit', {
    name: formModel.name.trim(),
    code: formModel.code.trim(),
    enabled: formModel.enabled,
    description: formModel.description.trim(),
  });
}
</script>

<template>
  <NModal v-model:show="show" preset="card" :title="title" class="w-[520px]">
    <NForm
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-placement="left"
      label-width="80"
    >
      <NFormItem label="角色名称" path="name">
        <NInput v-model:value="formModel.name" placeholder="例如：系统管理员" />
      </NFormItem>
      <NFormItem label="角色编码" path="code">
        <NInput v-model:value="formModel.code" placeholder="例如：sys_admin" />
      </NFormItem>
      <NFormItem label="状态" path="enabled">
        <NSwitch v-model:value="formModel.enabled" />
      </NFormItem>
      <NFormItem label="描述" path="description">
        <NInput
          v-model:value="formModel.description"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 5 }"
          placeholder="可选"
        />
      </NFormItem>
    </NForm>

    <template #footer>
      <div class="flex justify-end">
        <div class="flex gap-3">
          <NButton tertiary @click="show = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">保存</NButton>
        </div>
      </div>
    </template>
  </NModal>
</template>
