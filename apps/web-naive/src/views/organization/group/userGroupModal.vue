<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui';

import { computed, reactive, ref, watch } from 'vue';

import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSwitch,
} from 'naive-ui';

type FormValues = {
  code: string;
  name: string;
  description: string;
  enable: boolean;
  sort: number;
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
  name: '',
  description: '',
  enable: true,
  sort: 0,
});

const title = computed(() =>
  props.mode === 'create' ? '新增用户组' : '编辑用户组',
);

const rules = computed((): FormRules => {
  return {
    code: [
      {
        required: true,
        message: '请输入用户组编码',
        trigger: ['input', 'blur'],
      },
      {
        validator: (_rule, value: string) => {
          const v = (value || '').trim();
          if (!v) return true;

          const upper = v.toUpperCase();
          const original = (props.originalCode || '').trim().toUpperCase();
          if (props.mode === 'edit' && original && upper === original) {
            return true;
          }

          const exists = props.existingCodes.some(
            (c) => (c || '').trim().toUpperCase() === upper,
          );
          return exists ? new Error('用户组编码已存在') : true;
        },
        trigger: ['input', 'blur'],
      },
    ],
    name: [
      {
        required: true,
        message: '请输入用户组名称',
        trigger: ['input', 'blur'],
      },
    ],
  };
});

function applyInitialValues() {
  formModel.code = (props.initialValues?.code ?? '').toString();
  formModel.name = (props.initialValues?.name ?? '').toString();
  formModel.description = (props.initialValues?.description ?? '').toString();
  formModel.enable = Boolean(props.initialValues?.enable ?? true);
  formModel.sort = Number(props.initialValues?.sort ?? 0);
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

  const submitData: FormValues = {
    code: formModel.code.trim(),
    name: formModel.name.trim(),
    description: formModel.description.trim(),
    enable: formModel.enable,
    sort: formModel.sort,
  };

  emit('submit', submitData);
}
</script>

<template>
  <NModal v-model:show="show" preset="card" :title="title" class="w-[520px]">
    <NForm
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-placement="left"
      label-width="90"
    >
      <NFormItem label="编码" path="code">
        <NInput
          v-model:value="formModel.code"
          placeholder="请输入用户组编码（如：SALES_TEAM）"
          :disabled="mode === 'edit'"
        />
      </NFormItem>
      <NFormItem label="名称" path="name">
        <NInput
          v-model:value="formModel.name"
          placeholder="请输入用户组名称"
        />
      </NFormItem>
      <NFormItem label="描述" path="description">
        <NInput
          v-model:value="formModel.description"
          type="textarea"
          placeholder="请输入描述"
          :rows="3"
        />
      </NFormItem>
      <NFormItem label="排序" path="sort">
        <NInputNumber
          v-model:value="formModel.sort"
          placeholder="请输入排序"
          :min="0"
          class="w-full"
        />
      </NFormItem>
      <NFormItem label="状态" path="enable">
        <NSwitch v-model:value="formModel.enable" />
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
