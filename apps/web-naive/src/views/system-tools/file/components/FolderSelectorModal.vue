<script lang="ts" setup>
import { ref, watch } from 'vue';
import { NModal, NTree, type TreeOption } from 'naive-ui';
import { message } from '#/adapter/naive';
import { getFolderTreeApi } from '#/api/modules/file';
import type { FileApi } from '#/api/modules/file';

interface Props {
  show: boolean;
  title?: string;
  mode: 'move' | 'copy';
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'confirm', folderId: number | null): void;
}

const props = withDefaults(defineProps<Props>(), {
  title: '选择目标文件夹',
});

const emit = defineEmits<Emits>();

const loading = ref(false);
const treeData = ref<TreeOption[]>([]);
const selectedKeys = ref<Array<string | number>>([]);

watch(() => props.show, async (show) => {
  if (show) {
    await loadFolderTree();
  }
});

async function loadFolderTree() {
  loading.value = true;
  try {
    const folders = await getFolderTreeApi();
    treeData.value = [
      {
        key: 'root',
        label: '全部文件',
        children: buildTreeData(folders),
      },
    ];
  } catch (_error) {
    message.error('加载文件夹失败');
  } finally {
    loading.value = false;
  }
}

function buildTreeData(folders: FileApi.Folder[]): TreeOption[] {
  return folders.map((folder) => ({
    key: folder.id,
    label: folder.name,
    children: (folder as any).children ? buildTreeData((folder as any).children) : undefined,
  }));
}

function handleConfirm() {
  if (selectedKeys.value.length === 0) {
    message.warning('请选择目标文件夹');
    return;
  }

  const selectedKey = selectedKeys.value[0];
  const folderId = selectedKey === 'root' ? null : (selectedKey as number);
  
  emit('confirm', folderId);
  emit('update:show', false);
}

function handleClose() {
  emit('update:show', false);
}
</script>

<template>
  <NModal
    :show="show"
    preset="dialog"
    :title="title"
    positive-text="确定"
    negative-text="取消"
    :loading="loading"
    @positive-click="handleConfirm"
    @negative-click="handleClose"
    @close="handleClose"
  >
    <div class="py-4" style="max-height: 400px; overflow-y: auto;">
      <NTree
        v-model:selected-keys="selectedKeys"
        :data="treeData"
        :selectable="true"
        :default-expand-all="true"
        block-line
      />
    </div>
  </NModal>
</template>
