<script lang="ts" setup>
import { ref, watch } from 'vue';
import { NModal, NInput, NButton, NSpace } from 'naive-ui';
import { message } from '#/adapter/naive';
import { renameFileApi, renameFolderApi } from '#/api/modules/file';
import type { FileApi } from '#/api/modules/file';

interface Props {
  show: boolean;
  file: FileApi.FileItem | null;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const newName = ref('');
const loading = ref(false);

watch(() => props.show, (show) => {
  if (show && props.file) {
    newName.value = props.file.name;
  }
});

async function handleSubmit() {
  if (!props.file) return;
  
  if (!newName.value.trim()) {
    message.warning('请输入文件名');
    return;
  }

  if (newName.value === props.file.name) {
    emit('update:show', false);
    return;
  }

  loading.value = true;
  try {
    if (props.file.isFolder) {
      await renameFolderApi(props.file.id, newName.value);
    } else {
      await renameFileApi(props.file.id, newName.value);
    }
    
    message.success('重命名成功');
    emit('update:show', false);
    emit('success');
  } catch (error: any) {
    // 错误已被拦截器处理
    if (error?.response?.data?.message) {
      message.error(error.response.data.message);
    }
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  emit('update:show', false);
}
</script>

<template>
  <NModal
    :show="show"
    preset="dialog"
    title="重命名"
    positive-text="确定"
    negative-text="取消"
    :loading="loading"
    @positive-click="handleSubmit"
    @negative-click="handleClose"
    @close="handleClose"
  >
    <div class="py-4">
      <NInput
        v-model:value="newName"
        placeholder="请输入新文件名"
        @keyup.enter="handleSubmit"
      />
    </div>
  </NModal>
</template>
