<script lang="ts" setup>
import { NSpin, NCheckbox, NEmpty } from 'naive-ui';
import { IconifyIcon } from '@vben/icons';
import type { FileApi } from '#/api';

interface Props {
  files: FileApi.FileItem[];
  selectedFiles: Set<number>;
  loading?: boolean;
}

interface Emits {
  (e: 'file-click', file: FileApi.FileItem): void;
  (e: 'file-select', fileId: number): void;
  (e: 'file-context-menu', file: FileApi.FileItem, event: MouseEvent): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

// 判断是否是图片文件
function isImageFile(file: FileApi.FileItem): boolean {
  const ext = file.extension?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext || '');
}

// 获取图片 URL
function getImageUrl(file: FileApi.FileItem): string {
  return file.url;
}

// 获取文件图标
function getFileIcon(file: FileApi.FileItem): string {
  if (file.isFolder) {
    return 'mdi:folder';
  }
  
  const ext = file.extension?.toLowerCase();
  
  // 图片
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext || '')) {
    return 'mdi:file-image';
  }
  
  // 文档
  if (['doc', 'docx'].includes(ext || '')) {
    return 'mdi:file-word';
  }
  if (['xls', 'xlsx'].includes(ext || '')) {
    return 'mdi:file-excel';
  }
  if (['ppt', 'pptx'].includes(ext || '')) {
    return 'mdi:file-powerpoint';
  }
  if (ext === 'pdf') {
    return 'mdi:file-pdf-box';
  }
  if (['txt', 'md', 'log'].includes(ext || '')) {
    return 'mdi:file-document-outline';
  }
  
  // 视频
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v'].includes(ext || '')) {
    return 'mdi:file-video';
  }
  
  // 音频
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'].includes(ext || '')) {
    return 'mdi:file-music';
  }
  
  // 压缩包
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext || '')) {
    return 'mdi:folder-zip';
  }
  
  // 代码
  if (['js', 'jsx'].includes(ext || '')) {
    return 'mdi:language-javascript';
  }
  if (['ts', 'tsx'].includes(ext || '')) {
    return 'mdi:language-typescript';
  }
  if (ext === 'vue') {
    return 'mdi:vuejs';
  }
  if (['html', 'htm'].includes(ext || '')) {
    return 'mdi:language-html5';
  }
  if (['css', 'scss', 'sass', 'less'].includes(ext || '')) {
    return 'mdi:language-css3';
  }
  if (ext === 'json') {
    return 'mdi:code-json';
  }
  if (['py', 'pyc'].includes(ext || '')) {
    return 'mdi:language-python';
  }
  if (['java', 'class', 'jar'].includes(ext || '')) {
    return 'mdi:language-java';
  }
  if (['c', 'h'].includes(ext || '')) {
    return 'mdi:language-c';
  }
  if (['cpp', 'cc', 'cxx', 'hpp'].includes(ext || '')) {
    return 'mdi:language-cpp';
  }
  if (['php'].includes(ext || '')) {
    return 'mdi:language-php';
  }
  if (['go'].includes(ext || '')) {
    return 'mdi:language-go';
  }
  if (['rs'].includes(ext || '')) {
    return 'mdi:language-rust';
  }
  if (['swift'].includes(ext || '')) {
    return 'mdi:language-swift';
  }
  if (['kt', 'kts'].includes(ext || '')) {
    return 'mdi:language-kotlin';
  }
  if (['rb'].includes(ext || '')) {
    return 'mdi:language-ruby';
  }
  if (['sh', 'bash', 'zsh'].includes(ext || '')) {
    return 'mdi:bash';
  }
  if (['sql'].includes(ext || '')) {
    return 'mdi:database';
  }
  if (['xml'].includes(ext || '')) {
    return 'mdi:xml';
  }
  if (['yaml', 'yml'].includes(ext || '')) {
    return 'mdi:file-code';
  }
  
  // 可执行文件
  if (['exe', 'msi'].includes(ext || '')) {
    return 'mdi:microsoft-windows';
  }
  if (['app', 'dmg'].includes(ext || '')) {
    return 'mdi:apple';
  }
  if (['apk'].includes(ext || '')) {
    return 'mdi:android';
  }
  if (['deb', 'rpm'].includes(ext || '')) {
    return 'mdi:linux';
  }
  
  // 其他常见文件
  if (['iso', 'img'].includes(ext || '')) {
    return 'mdi:disc';
  }
  if (['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
    return 'mdi:format-font';
  }
  if (['psd', 'ai', 'sketch', 'fig'].includes(ext || '')) {
    return 'mdi:palette';
  }
  
  return 'mdi:file-outline';
}

// 获取文件图标颜色
function getFileIconColor(file: FileApi.FileItem): string {
  if (file.isFolder) {
    return '#60a5fa'; // 蓝色 - 文件夹
  }
  
  const ext = file.extension?.toLowerCase();
  
  // 图片 - 紫色
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext || '')) {
    return '#a78bfa';
  }
  
  // Word 文档 - 蓝色
  if (['doc', 'docx'].includes(ext || '')) {
    return '#2b579a';
  }
  
  // Excel 文档 - 绿色
  if (['xls', 'xlsx'].includes(ext || '')) {
    return '#217346';
  }
  
  // PowerPoint 文档 - 橙红色
  if (['ppt', 'pptx'].includes(ext || '')) {
    return '#d24726';
  }
  
  // PDF - 红色
  if (ext === 'pdf') {
    return '#ef4444';
  }
  
  // 文本文档 - 灰色
  if (['txt', 'md', 'log'].includes(ext || '')) {
    return '#9ca3af';
  }
  
  // 视频 - 粉色
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v'].includes(ext || '')) {
    return '#ec4899';
  }
  
  // 音频 - 青色
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'].includes(ext || '')) {
    return '#06b6d4';
  }
  
  // 压缩包 - 黄色
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext || '')) {
    return '#eab308';
  }
  
  // JavaScript - 黄色
  if (['js', 'jsx'].includes(ext || '')) {
    return '#f7df1e';
  }
  
  // TypeScript - 蓝色
  if (['ts', 'tsx'].includes(ext || '')) {
    return '#3178c6';
  }
  
  // Vue - 绿色
  if (ext === 'vue') {
    return '#42b883';
  }
  
  // HTML - 橙色
  if (['html', 'htm'].includes(ext || '')) {
    return '#e34c26';
  }
  
  // CSS - 蓝色
  if (['css', 'scss', 'sass', 'less'].includes(ext || '')) {
    return '#264de4';
  }
  
  // JSON - 黄色
  if (ext === 'json') {
    return '#fbbf24';
  }
  
  // Python - 蓝黄色
  if (['py', 'pyc'].includes(ext || '')) {
    return '#3776ab';
  }
  
  // Java - 红色
  if (['java', 'class', 'jar'].includes(ext || '')) {
    return '#f89820';
  }
  
  // C/C++ - 蓝色
  if (['c', 'h', 'cpp', 'cc', 'cxx', 'hpp'].includes(ext || '')) {
    return '#00599c';
  }
  
  // PHP - 紫色
  if (['php'].includes(ext || '')) {
    return '#777bb4';
  }
  
  // Go - 青色
  if (['go'].includes(ext || '')) {
    return '#00add8';
  }
  
  // Rust - 橙色
  if (['rs'].includes(ext || '')) {
    return '#ce422b';
  }
  
  // Swift - 橙色
  if (['swift'].includes(ext || '')) {
    return '#fa7343';
  }
  
  // Kotlin - 紫色
  if (['kt', 'kts'].includes(ext || '')) {
    return '#7f52ff';
  }
  
  // Ruby - 红色
  if (['rb'].includes(ext || '')) {
    return '#cc342d';
  }
  
  // Shell - 绿色
  if (['sh', 'bash', 'zsh'].includes(ext || '')) {
    return '#89e051';
  }
  
  // SQL - 蓝色
  if (['sql'].includes(ext || '')) {
    return '#00758f';
  }
  
  // XML - 橙色
  if (['xml'].includes(ext || '')) {
    return '#f97316';
  }
  
  // YAML - 红色
  if (['yaml', 'yml'].includes(ext || '')) {
    return '#ef4444';
  }
  
  // Windows 可执行文件 - 蓝色
  if (['exe', 'msi'].includes(ext || '')) {
    return '#0078d4';
  }
  
  // macOS 应用 - 灰色
  if (['app', 'dmg'].includes(ext || '')) {
    return '#a3a3a3';
  }
  
  // Android APK - 绿色
  if (['apk'].includes(ext || '')) {
    return '#3ddc84';
  }
  
  // Linux 包 - 黄色
  if (['deb', 'rpm'].includes(ext || '')) {
    return '#fcc624';
  }
  
  // 镜像文件 - 灰色
  if (['iso', 'img'].includes(ext || '')) {
    return '#6b7280';
  }
  
  // 字体文件 - 紫色
  if (['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
    return '#8b5cf6';
  }
  
  // 设计文件 - 粉色
  if (['psd', 'ai', 'sketch', 'fig'].includes(ext || '')) {
    return '#f472b6';
  }
  
  // 默认 - 灰色
  return '#9ca3af';
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '-';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// 处理文件点击
function handleFileClick(file: FileApi.FileItem, event: MouseEvent) {
  // 如果点击的是复选框区域，不触发文件点击
  if ((event.target as HTMLElement).closest('.file-checkbox')) {
    return;
  }
  emit('file-click', file);
}

// 处理文件选择
function handleFileSelect(fileId: number) {
  emit('file-select', fileId);
}

// 处理右键菜单
function handleContextMenu(file: FileApi.FileItem, event: MouseEvent) {
  event.preventDefault();
  emit('file-context-menu', file, event);
}
</script>

<template>
  <div class="file-browser">
    <NSpin :show="loading">
      <div v-if="files.length > 0" class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        <div
          v-for="file in files"
          :key="file.id"
          class="file-item group relative cursor-pointer rounded-lg border border-gray-700/50 bg-gray-800/50 p-4 transition-all hover:border-blue-500 hover:bg-gray-800"
          :class="{ 'border-blue-500 bg-gray-800': selectedFiles.has(file.id) }"
          @click="handleFileClick(file, $event)"
          @contextmenu="handleContextMenu(file, $event)"
        >
          <!-- 复选框 -->
          <div class="file-checkbox absolute left-2 top-2 z-10" @click.stop>
            <NCheckbox
              :checked="selectedFiles.has(file.id)"
              @update:checked="handleFileSelect(file.id)"
            />
          </div>

          <!-- 文件图标/缩略图 -->
          <div class="mb-3 flex h-20 items-center justify-center">
            <!-- 图片文件显示缩略图 -->
            <template v-if="isImageFile(file)">
              <img
                :src="getImageUrl(file)"
                :alt="file.name"
                class="max-h-full max-w-full rounded-lg object-contain"
                loading="lazy"
              />
            </template>
            <!-- 其他文件显示图标 -->
            <IconifyIcon
              v-else
              :icon="getFileIcon(file)"
              :color="getFileIconColor(file)"
              :width="64"
              :height="64"
            />
          </div>

          <!-- 文件名 -->
          <div class="mb-1 truncate text-center text-sm text-white" :title="file.name">
            {{ file.name }}
          </div>

          <!-- 文件大小 -->
          <div class="text-center text-xs text-gray-500">
            {{ formatFileSize(file.size) }}
          </div>
        </div>
      </div>

      <NEmpty
        v-else
        description="暂无文件"
        class="py-16"
      />
    </NSpin>
  </div>
</template>

<style scoped>
.file-browser {
  min-height: 400px;
}

.file-checkbox {
  /* 复选框始终可见 */
}
</style>
