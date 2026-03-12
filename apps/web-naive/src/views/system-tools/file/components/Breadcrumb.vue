<script lang="ts" setup>
import { computed } from 'vue';
import { NBreadcrumb, NBreadcrumbItem } from 'naive-ui';

interface Props {
  currentPath: Array<{ id: number | null; name: string }>;
}

interface Emits {
  (e: 'navigate', folderId: number | null): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const breadcrumbItems = computed(() => {
  return [
    { id: null, name: '全部文件' },
    ...props.currentPath,
  ];
});

function handleNavigate(folderId: number | null) {
  emit('navigate', folderId);
}
</script>

<template>
  <NBreadcrumb>
    <NBreadcrumbItem
      v-for="(item, index) in breadcrumbItems"
      :key="item.id ?? 'root'"
      :clickable="index < breadcrumbItems.length - 1"
      @click="index < breadcrumbItems.length - 1 && handleNavigate(item.id)"
    >
      {{ item.name }}
    </NBreadcrumbItem>
  </NBreadcrumb>
</template>

<style scoped>
.n-breadcrumb-item {
  cursor: pointer;
}

.n-breadcrumb-item:last-child {
  cursor: default;
}
</style>
