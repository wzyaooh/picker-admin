<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { NModal, NButton, NSpace, NSpin, NEmpty } from 'naive-ui';
import { message } from '#/adapter/naive';
import type { FileApi } from '#/api';
import { downloadFileApi } from '#/api/modules/file';

interface Props {
  show: boolean;
  file: FileApi.FileItem | null;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const loading = ref(false);
const previewUrl = ref('');

// 支持预览的文件类型
const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
const videoExtensions = ['mp4', 'webm', 'ogg', 'mov'];
const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
const pdfExtensions = ['pdf'];
const textExtensions = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'vue'];

// 判断文件类型
const fileType = computed(() => {
  if (!props.file) return 'unknown';
  
  const ext = props.file.extension.toLowerCase();
  
  if (imageExtensions.includes(ext)) return 'image';
  if (videoExtensions.includes(ext)) return 'video';
  if (audioExtensions.includes(ext)) return 'audio';
  if (pdfExtensions.includes(ext)) return 'pdf';
  if (textExtensions.includes(ext)) return 'text';
  
  return 'unknown';
});

// 是否支持预览
const canPreview = computed(() => {
  return fileType.value !== 'unknown';
});

// 加载预览
async function loadPreview() {
  if (!props.file || !canPreview.value) return;
  
  loading.value = true;
  try {
    // 直接使用文件的 URL 进行预览
    // 对于需要认证的文件，后端应该返回带有临时访问令牌的 URL
    previewUrl.value = props.file.url;
  } catch (_error) {
    message.error('加载预览失败');
  } finally {
    loading.value = false;
  }
}

// 清理预览
function cleanupPreview() {
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = '';
}

// 下载文件
async function handleDownload() {
  if (!props.file) return;
  
  try {
    const blob = await downloadFileApi(props.file.id);
    const url = window.URL.createObjectURL(blob as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = props.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    message.success('开始下载');
  } catch (_error) {
    // 错误已被拦截器处理
  }
}

// 监听弹窗显示状态
watch(() => props.show, (newVal) => {
  if (newVal) {
    loadPreview();
  } else {
    cleanupPreview();
  }
});
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="file?.name || '文件预览'"
    :style="{ width: '90vw', maxWidth: '1200px' }"
    @update:show="emit('update:show', $event)"
  >
    <template #header-extra>
      <NSpace>
        <NButton size="small" @click="handleDownload">
          <template #icon>
            <i class="lucide:download" />
          </template>
          下载
        </NButton>
      </NSpace>
    </template>

    <div class="flex min-h-[500px] items-center justify-center">
      <!-- 加载中 -->
      <NSpin v-if="loading" size="large" />

      <!-- 不支持预览 -->
      <NEmpty
        v-else-if="!canPreview"
        description="不支持预览此文件类型"
      >
        <template #extra>
          <NButton type="primary" @click="handleDownload">
            下载文件
          </NButton>
        </template>
      </NEmpty>

      <!-- 图片预览 -->
      <div
        v-else-if="fileType === 'image'"
        class="flex items-center justify-center"
      >
        <img
          :src="previewUrl"
          :alt="file?.name"
          class="max-h-[600px] max-w-full object-contain"
        />
      </div>

      <!-- 视频预览 -->
      <video
        v-else-if="fileType === 'video'"
        :src="previewUrl"
        controls
        class="max-h-[600px] max-w-full"
      >
        您的浏览器不支持视频播放
      </video>

      <!-- 音频预览 -->
      <div
        v-else-if="fileType === 'audio'"
        class="flex w-full flex-col items-center gap-4"
      >
        <i class="lucide:music text-6xl text-gray-400" />
        <audio :src="previewUrl" controls class="w-full max-w-md">
          您的浏览器不支持音频播放
        </audio>
      </div>

      <!-- PDF 预览 -->
      <iframe
        v-else-if="fileType === 'pdf'"
        :src="previewUrl"
        class="h-[600px] w-full border-0"
      />

      <!-- 文本预览 -->
      <div
        v-else-if="fileType === 'text'"
        class="h-[600px] w-full overflow-auto rounded-lg bg-gray-800 p-4 font-mono text-sm text-gray-300"
      >
        <!-- TODO: Load text content -->
        <pre>文本预览功能开发中...</pre>
      </div>
    </div>
  </NModal>
</template>
