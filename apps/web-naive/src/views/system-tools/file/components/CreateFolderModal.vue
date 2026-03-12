<script lang="ts" setup>
import { ref, watch } from 'vue';
import { NModal, NButton, NSpace } from 'naive-ui';
import { useVbenForm, z } from '#/adapter/form';
import { message } from '#/adapter/naive';
import { createFolderApi } from '#/api/modules/file';

interface Props {
  show: boolean;
  currentFolderId: number | null;
  storageConfigId?: number;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const submitting = ref(false);

// Form configuration
const [Form, formApi] = useVbenForm({
  // 隐藏表单自带的操作按钮
  showDefaultActions: false,
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入文件夹名称',
        maxlength: 50,
        showCount: true,
        autofocus: true,
      },
      fieldName: 'name',
      label: '文件夹名称',
      rules: z
        .string()
        .min(1, { message: '请输入文件夹名称' })
        .max(50, { message: '文件夹名称不能超过50个字符' })
        .refine(
          (val) => !/[<>:"/\\|?*]/.test(val),
          { message: '文件夹名称不能包含特殊字符 < > : " / \\ | ? *' }
        ),
    },
  ],
});

// Watch show prop to reset form
watch(() => props.show, (newVal) => {
  if (newVal) {
    formApi.resetForm();
  }
});

// Handle submit
async function handleSubmit() {
  const valid = await formApi.validate();
  if (!valid) return;

  submitting.value = true;
  try {
    const values = await formApi.getValues();
    await createFolderApi({
      name: (values as any).name.trim(),
      parentId: props.currentFolderId,
      storageConfigId: props.storageConfigId,
    });
    
    message.success('文件夹创建成功');
    emit('update:show', false);
    emit('success');
  } catch (_error) {
    // Error already handled by interceptor
  } finally {
    submitting.value = false;
  }
}

// Handle cancel
function handleCancel() {
  emit('update:show', false);
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    title="新建文件夹"
    :style="{ width: '500px' }"
    :mask-closable="false"
    @update:show="emit('update:show', $event)"
  >
    <Form />

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleCancel">
          取消
        </NButton>
        <NButton
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          创建
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
