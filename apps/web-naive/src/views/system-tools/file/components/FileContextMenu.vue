<script lang="ts" setup>
import { computed } from 'vue';
import { NDropdown, type DropdownOption } from 'naive-ui';
import type { FileApi } from '#/api/modules/file';

interface Props {
  file: FileApi.FileItem;
  x: number;
  y: number;
  show: boolean;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'rename', file: FileApi.FileItem): void;
  (e: 'delete', file: FileApi.FileItem): void;
  (e: 'permanent-delete', file: FileApi.FileItem): void;
  (e: 'move', file: FileApi.FileItem): void;
  (e: 'copy', file: FileApi.FileItem): void;
  (e: 'download', file: FileApi.FileItem): void;
  (e: 'share', file: FileApi.FileItem): void;
  (e: 'favorite', file: FileApi.FileItem): void;
  (e: 'tags', file: FileApi.FileItem): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const options = computed((): DropdownOption[] => [
  {
    label: '重命名',
    key: 'rename',
  },
  {
    label: '下载',
    key: 'download',
  },
  {
    type: 'divider',
    key: 'd1',
  },
  {
    label: '移动到',
    key: 'move',
  },
  {
    label: '复制到',
    key: 'copy',
  },
  {
    type: 'divider',
    key: 'd2',
  },
  {
    label: props.file.isFavorite ? '取消收藏' : '收藏',
    key: 'favorite',
  },
  {
    label: '添加标签',
    key: 'tags',
  },
  {
    label: '分享',
    key: 'share',
  },
  {
    type: 'divider',
    key: 'd3',
  },
  {
    label: '删除',
    key: 'delete',
  },
  {
    label: '彻底删除',
    key: 'permanent-delete',
    props: {
      style: 'color: #e88080;',
    },
  },
]);

function handleSelect(key: string) {
  emit('update:show', false);
  
  switch (key) {
    case 'rename':
      emit('rename', props.file);
      break;
    case 'delete':
      emit('delete', props.file);
      break;
    case 'permanent-delete':
      emit('permanent-delete', props.file);
      break;
    case 'move':
      emit('move', props.file);
      break;
    case 'copy':
      emit('copy', props.file);
      break;
    case 'download':
      emit('download', props.file);
      break;
    case 'share':
      emit('share', props.file);
      break;
    case 'favorite':
      emit('favorite', props.file);
      break;
    case 'tags':
      emit('tags', props.file);
      break;
  }
}

function handleClickOutside() {
  emit('update:show', false);
}
</script>

<template>
  <NDropdown
    :show="show"
    :x="x"
    :y="y"
    :options="options"
    placement="bottom-start"
    @select="handleSelect"
    @clickoutside="handleClickOutside"
  />
</template>
