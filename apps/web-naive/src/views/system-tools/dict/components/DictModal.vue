<script lang="ts" setup>
import { watch } from 'vue';
import { NModal } from 'naive-ui';
import { useVbenForm, z } from '#/adapter/form';
import { message } from '#/adapter/naive';
import { createDictApi, updateDictApi } from '#/api/modules/dict';
import type { DictApi } from '#/api/modules/dict';

defineOptions({ name: 'DictModal' });

interface Props {
  show: boolean;
  mode?: 'create' | 'edit';
  initialValues?: Partial<DictApi.Dict>;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'submit'): void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
});

const emit = defineEmits<Emits>();

// 表单配置
const [Form, formApi] = useVbenForm({
  // 禁用表单默认按钮，使用 Modal 的按钮
  showDefaultActions: false,
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入字典编码（字母、数字、下划线）',
      },
      fieldName: 'code',
      label: '字典编码',
      rules: z
        .string()
        .min(1, { message: '请输入字典编码' })
        .max(50, { message: '字典编码不能超过50个字符' })
        .regex(/^[a-zA-Z0-9_]+$/, {
          message: '字典编码只能包含字母、数字和下划线',
        }),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入字典名称',
      },
      fieldName: 'name',
      label: '字典名称',
      rules: z
        .string()
        .min(1, { message: '请输入字典名称' })
        .max(50, { message: '字典名称不能超过50个字符' }),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入字典描述（可选）',
        type: 'textarea',
        rows: 3,
      },
      fieldName: 'description',
      label: '字典描述',
    },
    {
      component: 'Switch',
      componentProps: {
        checkedValue: true,
        uncheckedValue: false,
      },
      fieldName: 'enable',
      label: '是否启用',
      defaultValue: true,
    },
  ],
});

// 监听 show 变化，重置或设置表单
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      if (props.initialValues) {
        // 编辑模式：设置初始值
        // 将数据库的 1/0 转换为 boolean
        const enableValue =
          props.initialValues.enable === 1 ||
          props.initialValues.enable === true;

        formApi.setValues({
          code: props.initialValues.code || '',
          name: props.initialValues.name || '',
          description: props.initialValues.description || '',
          enable: enableValue,
        });
      } else {
        // 创建模式：重置表单
        formApi.resetForm();
        formApi.setValues({ enable: true });
      }
    }
  },
);

// 提交处理
async function handleSubmit() {
  const valid = await formApi.validate();
  if (!valid) {
    return;
  }

  try {
    const values = await formApi.getValues();

    if (props.mode === 'create') {
      await createDictApi(values as DictApi.CreateDictParams);
      message.success('创建成功');
    } else {
      if (!props.initialValues?.id) {
        message.error('缺少字典ID');
        return;
      }
      await updateDictApi(
        props.initialValues.id,
        values as DictApi.UpdateDictParams,
      );
      message.success('更新成功');
    }

    emit('update:show', false);
    emit('submit');
  } catch (error) {
    // 错误已被拦截器处理
    console.error('Failed to submit dict:', error);
  }
}

// 关闭处理
function handleClose() {
  emit('update:show', false);
}
</script>

<template>
  <NModal
    :show="show"
    preset="dialog"
    :title="mode === 'create' ? '新增字典' : '编辑字典'"
    :positive-text="mode === 'create' ? '创建' : '更新'"
    negative-text="取消"
    @positive-click="handleSubmit"
    @negative-click="handleClose"
    @close="handleClose"
  >
    <Form />
  </NModal>
</template>
