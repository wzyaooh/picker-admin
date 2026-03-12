<script setup lang="ts">
import type { FormInst, FormRules, SelectOption, TreeSelectOption } from 'naive-ui';

import { computed, reactive, ref, watch } from 'vue';

import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSwitch,
  NTreeSelect,
} from 'naive-ui';

type FormValues = {
  code: string;
  name: string;
  description: string;
  parentId: number | null;
  order: number;
  enable: boolean;
};

interface Props {
  parentOptions: TreeSelectOption[];
  initialValues?: Partial<FormValues>;
  mode: 'create' | 'edit';
  existingCodes: string[];
  originalCode?: string;
}

const props = withDefaults(defineProps<Props>(), {
  parentOptions: () => [],
  initialValues: () => ({}),
  existingCodes: () => [],
  originalCode: undefined,
});

const emit = defineEmits<{ submit: [FormValues] }>();

const show = defineModel<boolean>('show', { required: true });

const formRef = ref<FormInst | null>(null);

const formModel = reactive<FormValues>({
  code: '',
  name: '',
  description: '',
  parentId: null,
  order: 0,
  enable: true,
});

const title = computed(() => (props.mode === 'create' ? '新增部门' : '编辑部门'));

const rules = computed((): FormRules => {
  return {
    code: [
      {
        required: true,
        message: '请输入部门编码',
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
            (code) => (code || '').trim().toLowerCase() === lower,
          );
          return exists ? new Error('部门编码已存在') : true;
        },
        trigger: ['input', 'blur'],
      },
    ],
    name: [
      {
        required: true,
        message: '请输入部门名称',
        trigger: ['input', 'blur'],
      },
    ],
  };
});

function applyInitialValues() {
  formModel.code = (props.initialValues?.code ?? '').toString();
  formModel.name = (props.initialValues?.name ?? '').toString();
  formModel.description = (props.initialValues?.description ?? '').toString();
  formModel.parentId = props.initialValues?.parentId ?? null;
  formModel.order = Number(props.initialValues?.order ?? 0);
  formModel.enable = Boolean(props.initialValues?.enable ?? true);
}

watch(
  () => show.value,
  (val) => {
    if (!val) return;
    applyInitialValues();
    formRef.value?.restoreValidation();
  },
);

async function handleSubmit() {
  const form = formRef.value;
  if (!form) return;

  await form.validate();

  emit('submit', {
    code: formModel.code.trim(),
    name: formModel.name.trim(),
    description: formModel.description.trim(),
    parentId: formModel.parentId,
    order: Number.isFinite(formModel.order) ? formModel.order : 0,
    enable: formModel.enable,
  });
}
</script>

<template>
  <NModal v-model:show="show" preset="card" :title="title" class="w-[560px]">
    <NForm
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-placement="left"
      label-width="90"
    >
      <NFormItem label="部门编码" path="code">
        <NInput
          v-model:value="formModel.code"
          placeholder="请输入部门编码"
          maxlength="50"
          show-count
        />
      </NFormItem>

      <NFormItem label="部门名称" path="name">
        <NInput
          v-model:value="formModel.name"
          placeholder="请输入部门名称"
          maxlength="100"
          show-count
        />
      </NFormItem>

      <NFormItem label="上级部门" path="parentId">
        <NTreeSelect
          v-model:value="formModel.parentId"
          :options="parentOptions"
          placeholder="请选择上级部门（不选则为顶级部门）"
          clearable
          key-field="value"
          label-field="label"
          children-field="children"
        />
      </NFormItem>

      <NFormItem label="部门描述" path="description">
        <NInput
          v-model:value="formModel.description"
          type="textarea"
          placeholder="请输入部门描述"
          :rows="3"
          maxlength="500"
          show-count
        />
      </NFormItem>

      <NFormItem label="排序" path="order">
        <NInputNumber v-model:value="formModel.order" :min="0" class="w-full" />
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
