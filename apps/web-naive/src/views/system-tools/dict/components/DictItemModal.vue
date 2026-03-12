<script lang="ts" setup>
import { watch } from 'vue';
import { NModal } from 'naive-ui';
import { useVbenForm, z } from '#/adapter/form';
import { message } from '#/adapter/naive';
import { createDictItemApi, updateDictItemApi } from '#/api/modules/dict';
import type { DictApi } from '#/api/modules/dict';

defineOptions({ name: 'DictItemModal' });

interface Props {
  show: boolean;
  dictId: number | null;
  mode?: 'create' | 'edit';
  initialValues?: Partial<DictApi.DictItem>;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'submit'): void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
});

const emit = defineEmits<Emits>();

// 颜色选项
const colorOptions = [
  { label: '成功（绿色）', value: 'success' },
  { label: '错误（红色）', value: 'error' },
  { label: '警告（黄色）', value: 'warning' },
  { label: '信息（蓝色）', value: 'info' },
  { label: '默认（灰色）', value: 'default' },
  { label: '主要（紫色）', value: 'primary' },
  { label: '蓝色', value: 'blue' },
  { label: '绿色', value: 'green' },
  { label: '橙色', value: 'orange' },
  { label: '紫色', value: 'purple' },
  { label: '红色', value: 'red' },
];

// 表单配置
const [Form, formApi] = useVbenForm({
  // 禁用表单默认按钮，使用 Modal 的按钮
  showDefaultActions: false,
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入字典项标签',
      },
      fieldName: 'label',
      label: '标签',
      rules: z
        .string()
        .min(1, { message: '请输入标签' })
        .max(100, { message: '标签不能超过100个字符' }),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入字典项值',
      },
      fieldName: 'value',
      label: '值',
      rules: z
        .string()
        .min(1, { message: '请输入值' })
        .max(100, { message: '值不能超过100个字符' }),
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择颜色标签（可选）',
        options: colorOptions,
        clearable: true,
      },
      fieldName: 'color',
      label: '颜色',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入描述（可选）',
        type: 'textarea',
        rows: 3,
      },
      fieldName: 'description',
      label: '描述',
    },
    {
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入排序值',
        min: 0,
        style: { width: '100%' },
      },
      fieldName: 'sort',
      label: '排序',
      defaultValue: 0,
      rules: z.number().min(0, { message: '排序值必须为非负整数' }),
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
          label: props.initialValues.label || '',
          value: props.initialValues.value || '',
          color: props.initialValues.color || null,
          description: props.initialValues.description || '',
          sort: props.initialValues.sort ?? 0,
          enable: enableValue,
        });
      } else {
        // 创建模式：重置表单
        formApi.resetForm();
        formApi.setValues({ sort: 0, enable: true });
      }
    }
  },
);

// 提交处理
async function handleSubmit() {
  if (!props.dictId) {
    message.warning('请先选择一个字典');
    return;
  }

  const valid = await formApi.validate();
  if (!valid) {
    return;
  }

  try {
    const values = await formApi.getValues();

    if (props.mode === 'create') {
      await createDictItemApi(
        props.dictId,
        values as DictApi.CreateDictItemParams,
      );
      message.success('创建成功');
    } else {
      if (!props.initialValues?.id) {
        message.error('缺少字典项ID');
        return;
      }
      await updateDictItemApi(
        props.dictId,
        props.initialValues.id,
        values as DictApi.UpdateDictItemParams,
      );
      message.success('更新成功');
    }

    emit('update:show', false);
    emit('submit');
  } catch (error) {
    // 错误已被拦截器处理
    console.error('Failed to submit dict item:', error);
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
    :title="mode === 'create' ? '新增字典项' : '编辑字典项'"
    :positive-text="mode === 'create' ? '创建' : '更新'"
    negative-text="取消"
    @positive-click="handleSubmit"
    @negative-click="handleClose"
    @close="handleClose"
  >
    <Form />
  </NModal>
</template>
