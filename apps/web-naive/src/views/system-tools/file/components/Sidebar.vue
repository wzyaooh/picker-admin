<script lang="ts" setup>
import { computed } from 'vue';
import { NCard, NProgress, NButton } from 'naive-ui';
import type { FileApi } from '#/api';

interface Props {
  currentCategory: FileApi.FileCategory;
  storageInfo: FileApi.StorageInfo;
  categoryCounts: Record<FileApi.FileCategory, number>;
}

interface Emits {
  (e: 'category-change', category: FileApi.FileCategory): void;
  (e: 'open-recycle-bin'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 分类列表
const categories: Array<{ key: FileApi.FileCategory; label: string; icon: string }> = [
  { key: 'all', label: '全部', icon: 'lucide:folder-open' },
  { key: 'image', label: '图片', icon: 'lucide:image' },
  { key: 'document', label: '文档', icon: 'lucide:file-text' },
  { key: 'video', label: '视频', icon: 'lucide:video' },
  { key: 'audio', label: '音频', icon: 'lucide:music' },
  { key: 'other', label: '其他', icon: 'lucide:file' },
];

// 计算存储使用百分比
const storagePercentage = computed(() => {
  return Math.round((props.storageInfo.used / props.storageInfo.total) * 100);
});

// 格式化存储大小
function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}

// 获取进度条颜色
const progressColor = computed(() => {
  const percentage = storagePercentage.value;
  if (percentage >= 90) return '#ef4444';
  if (percentage >= 80) return '#f59e0b';
  return '#3b82f6';
});

// 处理分类点击
function handleCategoryClick(category: FileApi.FileCategory) {
  emit('category-change', category);
}
</script>

<template>
  <div class="space-y-4">
    <!-- 文件分类 -->
    <NCard title="文件分类" :bordered="false" size="small">
      <div class="space-y-1">
        <div
          v-for="category in categories"
          :key="category.key"
          class="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-700"
          :class="{
            'bg-blue-600 text-white': currentCategory === category.key,
            'text-gray-300': currentCategory !== category.key,
          }"
          @click="handleCategoryClick(category.key)"
        >
          <div class="flex items-center gap-2">
            <i :class="category.icon" class="text-lg" />
            <span class="text-sm">{{ category.label }}</span>
          </div>
          <span class="text-xs opacity-75">
            {{ categoryCounts[category.key] }}
          </span>
        </div>
      </div>
    </NCard>

    <!-- 存储空间 -->
    <NCard title="存储空间" :bordered="false" size="small">
      <div class="space-y-4">
        <!-- 环形进度图 -->
        <div class="flex items-center justify-center">
          <div class="relative">
            <NProgress
              type="circle"
              :percentage="storagePercentage"
              :stroke-width="8"
              :color="progressColor"
              :show-indicator="false"
              :style="{ width: '120px', height: '120px' }"
            />
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <div class="text-2xl font-bold text-white">
                {{ storagePercentage }}%
              </div>
              <div class="text-xs text-gray-400">已使用</div>
            </div>
          </div>
        </div>

        <!-- 存储详情 -->
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-400">已用空间</span>
            <span class="text-white">{{ formatSize(storageInfo.used) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">可用空间</span>
            <span class="text-white">{{ formatSize(storageInfo.available) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">总空间</span>
            <span class="text-white">{{ formatSize(storageInfo.total) }}</span>
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="border-t border-gray-700" />

        <!-- 文件统计 -->
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-400">文件数量</span>
            <span class="text-white">{{ storageInfo.fileCount }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">文件夹数量</span>
            <span class="text-white">{{ storageInfo.folderCount }}</span>
          </div>
        </div>
      </div>
    </NCard>

    <!-- 快捷入口 -->
    <NCard title="快捷入口" :bordered="false" size="small">
      <NButton block @click="emit('open-recycle-bin')">
        <template #icon>
          <i class="lucide:trash-2" />
        </template>
        回收站
      </NButton>
    </NCard>
  </div>
</template>
