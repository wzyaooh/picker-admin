<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { NModal, NUpload, NUploadDragger, NButton, NProgress, NText, NAlert } from 'naive-ui';
import { message } from '#/adapter/naive';
import { uploadFileApi } from '#/api/modules/file';

interface Props {
  show: boolean;
  currentFolderId: number | null;
  storageConfigId?: number;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'upload-complete'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// ==================== 配置常量 ====================
// 这些值应该与后端配置保持一致
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILE_COUNT = 10;
const UPLOAD_RATE_LIMIT = 20; // 60秒内最多20次
const UPLOAD_RATE_WINDOW = 60000; // 60秒

// 允许的文件扩展名（与后端保持一致）
const ALLOWED_EXTENSIONS = [
  // 图片
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico',
  // 文档
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv',
  // 压缩文件
  'zip', 'rar', '7z', 'tar', 'gz',
  // 音频
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a',
  // 视频
  'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm',
  // 代码
  'js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml',
  'java', 'py', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'swift', 'kt',
];

// 危险文件扩展名（与后端保持一致）
const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'jar',
  'sh', 'bash', 'zsh', 'fish', 'ps1', 'psm1',
  'app', 'deb', 'rpm', 'dmg', 'pkg',
];

// ==================== 状态管理 ====================
const fileList = ref<any[]>([]);
const uploading = ref(false);
const uploadProgress = ref(0);
const currentUploadIndex = ref(0);
const validationErrors = ref<string[]>([]);
const uploadHistory = ref<number[]>([]); // 记录上传时间戳
const uploadComplete = ref(false); // 上传是否完成
const uploadResult = ref<{
  successCount: number;
  failedCount: number;
  failedFiles: Array<{ name: string; error: string }>;
} | null>(null); // 上传结果

// ==================== 计算属性 ====================
// 检查是否有验证错误
const hasValidationErrors = computed(() => validationErrors.value.length > 0);

// 检查是否超过速率限制
const isRateLimited = computed(() => {
  const now = Date.now();
  const recentUploads = uploadHistory.value.filter(
    timestamp => now - timestamp < UPLOAD_RATE_WINDOW
  );
  return recentUploads.length >= UPLOAD_RATE_LIMIT;
});

// 计算剩余等待时间
const remainingWaitTime = computed(() => {
  if (!isRateLimited.value || uploadHistory.value.length === 0) return 0;
  const now = Date.now();
  const oldestUpload = uploadHistory.value[0]!; // 已经检查了 length > 0
  return Math.ceil((UPLOAD_RATE_WINDOW - (now - oldestUpload)) / 1000);
});

// ==================== 工具函数 ====================
// 获取文件扩展名
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }
  return filename.substring(lastDotIndex + 1).toLowerCase();
}

// 验证文件类型
function validateFileType(filename: string): { valid: boolean; error?: string } {
  const extension = getFileExtension(filename);
  
  if (!extension) {
    return { valid: false, error: `文件"${filename}"没有扩展名` };
  }

  // 检查是否是危险文件
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `不支持上传 .${extension} 类型的文件，存在安全风险`
    };
  }

  // 检查是否在允许列表中
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `不支持的文件类型: .${extension}。支持的类型包括：图片、文档、压缩文件、音视频等`
    };
  }

  return { valid: true };
}

// 验证文件大小
function validateFileSize(filename: string, size: number): { valid: boolean; error?: string } {
  if (size === 0) {
    return { valid: false, error: `文件"${filename}"大小为 0，无法上传空文件` };
  }

  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件"${filename}"过大（${formatFileSize(size)}），最大支持 ${formatFileSize(MAX_FILE_SIZE)}`
    };
  }

  return { valid: true };
}

// 验证文件名
function validateFileName(filename: string): { valid: boolean; error?: string } {
  if (!filename || filename.trim().length === 0) {
    return { valid: false, error: '文件名不能为空' };
  }

  if (filename.length > 255) {
    return {
      valid: false,
      error: `文件名"${filename}"过长（${filename.length} 字符），最多支持 255 个字符`
    };
  }

  // 检查非法字符
  const illegalChars = /[<>:"/\\|?*\x00-\x1F]/g;
  if (illegalChars.test(filename)) {
    return {
      valid: false,
      error: `文件名"${filename}"包含非法字符，不能包含：< > : " / \\ | ? * 等特殊字符`
    };
  }

  // 检查隐藏文件
  if (filename.startsWith('.')) {
    return {
      valid: false,
      error: `不支持上传隐藏文件（文件名不能以 . 开头）`
    };
  }

  return { valid: true };
}

// 验证所有文件
function validateFiles(): boolean {
  validationErrors.value = [];

  // 检查文件数量
  if (fileList.value.length === 0) {
    validationErrors.value.push('请选择要上传的文件');
    return false;
  }

  if (fileList.value.length > MAX_FILE_COUNT) {
    validationErrors.value.push(`最多只能上传 ${MAX_FILE_COUNT} 个文件，当前选择了 ${fileList.value.length} 个`);
    return false;
  }

  // 检查速率限制
  if (isRateLimited.value) {
    validationErrors.value.push(
      `上传过于频繁，请 ${remainingWaitTime.value} 秒后再试。（限制：60 秒内最多上传 ${UPLOAD_RATE_LIMIT} 个文件）`
    );
    return false;
  }

  // 验证每个文件
  for (const fileItem of fileList.value) {
    const file = fileItem.file;
    if (!file) continue;

    // 验证文件名
    const nameValidation = validateFileName(file.name);
    if (!nameValidation.valid) {
      validationErrors.value.push(nameValidation.error!);
      continue;
    }

    // 验证文件类型
    const typeValidation = validateFileType(file.name);
    if (!typeValidation.valid) {
      validationErrors.value.push(typeValidation.error!);
      continue;
    }

    // 验证文件大小
    const sizeValidation = validateFileSize(file.name, file.size);
    if (!sizeValidation.valid) {
      validationErrors.value.push(sizeValidation.error!);
    }
  }

  return validationErrors.value.length === 0;
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// 清理过期的上传记录
function cleanupUploadHistory() {
  const now = Date.now();
  uploadHistory.value = uploadHistory.value.filter(
    timestamp => now - timestamp < UPLOAD_RATE_WINDOW
  );
}

// ==================== 事件处理 ====================
// 监听弹窗显示状态
watch(() => props.show, (newVal) => {
  if (newVal) {
    fileList.value = [];
    validationErrors.value = [];
    uploadComplete.value = false;
    uploadResult.value = null;
    cleanupUploadHistory();
  }
});

// 处理文件选择
function handleFileChange(options: any) {
  const { fileList: newFileList } = options;
  fileList.value = newFileList;
  
  // 实时验证
  if (newFileList.length > 0) {
    validateFiles();
  } else {
    validationErrors.value = [];
  }
}

// 自定义上传前检查
function handleBeforeUpload(options: any): boolean {
  const { file } = options;
  
  // 验证文件名
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.valid) {
    message.error(nameValidation.error!);
    return false;
  }

  // 验证文件类型
  const typeValidation = validateFileType(file.name);
  if (!typeValidation.valid) {
    message.error(typeValidation.error!);
    return false;
  }

  // 验证文件大小
  const sizeValidation = validateFileSize(file.name, file.size);
  if (!sizeValidation.valid) {
    message.error(sizeValidation.error!);
    return false;
  }

  return true;
}

// 开始上传（优化版：并发上传）
async function handleUpload() {
  // 验证所有文件
  if (!validateFiles()) {
    return false; // 返回 false 阻止弹窗关闭
  }

  uploading.value = true;
  uploadProgress.value = 0;
  currentUploadIndex.value = 0;

  try {
    const totalFiles = fileList.value.length;
    let successCount = 0;
    let completedCount = 0;
    const failedFiles: Array<{ name: string; error: string }> = [];
    
    // 并发上传配置
    const CONCURRENT_LIMIT = 3; // 同时上传3个文件

    // 上传单个文件的函数
    const uploadSingleFile = async (fileItem: any) => {
      try {
        await uploadFileApi({
          file: fileItem.file,
          folderId: props.currentFolderId,
          storageConfigId: props.storageConfigId,
        });
        
        successCount++;
        
        // 记录上传时间
        uploadHistory.value.push(Date.now());
      } catch (error: any) {
        const errorMessage = error?.response?.data?.message || error?.message || '未知错误';
        failedFiles.push({ 
          name: fileItem.name,
          error: errorMessage
        });
      } finally {
        completedCount++;
        currentUploadIndex.value = completedCount;
        uploadProgress.value = Math.round((completedCount / totalFiles) * 100);
      }
    };

    // 使用 Promise.all 配合切片实现并发控制
    const uploadInBatches = async () => {
      for (let i = 0; i < fileList.value.length; i += CONCURRENT_LIMIT) {
        const batch = fileList.value.slice(i, i + CONCURRENT_LIMIT);
        await Promise.all(batch.map(fileItem => uploadSingleFile(fileItem)));
      }
    };

    await uploadInBatches();

    // 保存上传结果
    uploadResult.value = {
      successCount,
      failedCount: failedFiles.length,
      failedFiles,
    };
    uploadComplete.value = true;

    // 显示上传结果
    if (failedFiles.length === 0) {
      message.success(`成功上传 ${totalFiles} 个文件`);
    } else if (successCount > 0) {
      message.warning(
        `成功上传 ${successCount} 个文件，${failedFiles.length} 个文件上传失败`
      );
    } else {
      message.error('所有文件上传失败');
    }

    // 清理上传历史记录
    cleanupUploadHistory();

    // 立即触发刷新事件，让父组件更新文件列表
    // 这样用户可以立即看到上传的文件
    if (successCount > 0) {
      emit('upload-complete');
    }
    
    // 返回 false 阻止弹窗关闭，让用户查看结果后手动关闭
    return false;
  } catch (error) {
    message.error('上传过程中发生错误');
    return false; // 返回 false 阻止弹窗关闭
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
    currentUploadIndex.value = 0;
  }
}

// 关闭弹窗
function handleClose() {
  if (uploading.value) {
    message.warning('文件正在上传中，请稍候');
    return;
  }
  
  // 重置状态
  uploadComplete.value = false;
  uploadResult.value = null;
  
  emit('update:show', false);
}

// 移除文件
function handleRemoveFile(index: number) {
  fileList.value.splice(index, 1);
  // 重新验证
  if (fileList.value.length > 0) {
    validateFiles();
  } else {
    validationErrors.value = [];
  }
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    title="上传文件"
    :show-icon="false"
    style="width: 700px"
    :closable="!uploading"
    :mask-closable="!uploading"
    @update:show="(val) => !uploading && emit('update:show', val)"
  >
    <div class="space-y-4">
      <!-- 速率限制警告 -->
      <NAlert
        v-if="isRateLimited"
        type="warning"
        title="上传速率限制"
        closable
      >
        上传过于频繁，请 {{ remainingWaitTime }} 秒后再试。
        <br>
        限制：60 秒内最多上传 {{ UPLOAD_RATE_LIMIT }} 个文件
      </NAlert>

      <!-- 验证错误提示 -->
      <NAlert
        v-if="hasValidationErrors && !isRateLimited"
        type="error"
        title="文件验证失败"
        closable
      >
        <div class="space-y-1">
          <div v-for="(error, index) in validationErrors" :key="index" class="text-sm">
            • {{ error }}
          </div>
        </div>
      </NAlert>

      <!-- 上传提示 -->
      <NAlert type="info" closable>
        <div class="space-y-1 text-sm">
          <div>• 单个文件最大 {{ formatFileSize(MAX_FILE_SIZE) }}</div>
          <div>• 最多同时上传 {{ MAX_FILE_COUNT }} 个文件</div>
          <div>• 支持的文件类型：图片、文档、压缩文件、音视频、代码文件等</div>
          <div>• 不支持可执行文件（.exe、.bat 等）</div>
        </div>
      </NAlert>

      <!-- 上传区域 -->
      <NUpload
        v-model:file-list="fileList"
        multiple
        directory-dnd
        :max="MAX_FILE_COUNT"
        :on-before-upload="handleBeforeUpload"
        @change="handleFileChange"
      >
        <NUploadDragger>
          <div class="py-8">
            <div class="mb-4 flex justify-center">
              <i class="lucide:upload-cloud text-6xl text-blue-400" />
            </div>
            <NText class="text-base">
              点击或拖拽文件到此区域上传
            </NText>
            <NText depth="3" class="mt-2 text-sm">
              支持单个或批量上传，最多 {{ MAX_FILE_COUNT }} 个文件
            </NText>
          </div>
        </NUploadDragger>
      </NUpload>

      <!-- 文件列表 -->
      <div v-if="fileList.length > 0" class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-gray-300">
            已选择 {{ fileList.length }} 个文件
          </div>
          <div class="text-xs text-gray-400">
            总大小: {{ formatFileSize(fileList.reduce((sum, f) => sum + (f.file?.size || 0), 0)) }}
          </div>
        </div>
        <div class="max-h-60 space-y-2 overflow-y-auto">
          <div
            v-for="(file, index) in fileList"
            :key="index"
            class="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3"
          >
            <div class="flex flex-1 items-center gap-3 overflow-hidden">
              <i class="lucide:file text-xl text-gray-400" />
              <div class="flex-1 overflow-hidden">
                <div class="truncate text-sm text-white" :title="file.name">
                  {{ file.name }}
                </div>
                <div class="text-xs text-gray-400">
                  {{ formatFileSize(file.file?.size || 0) }}
                </div>
              </div>
            </div>
            <NButton
              v-if="!uploading"
              text
              type="error"
              size="small"
              @click="handleRemoveFile(index)"
            >
              <template #icon>
                <i class="lucide:x" />
              </template>
            </NButton>
          </div>
        </div>
      </div>

      <!-- 上传进度 -->
      <div v-if="uploading" class="space-y-2">
        <div class="text-sm text-gray-300">
          正在上传第 {{ currentUploadIndex }} / {{ fileList.length }} 个文件...
        </div>
        <NProgress
          type="line"
          :percentage="uploadProgress"
          :show-indicator="true"
          status="info"
        />
      </div>

      <!-- 上传结果 -->
      <div v-if="uploadComplete && uploadResult" class="space-y-3">
        <!-- 成功提示 -->
        <NAlert
          v-if="uploadResult.failedCount === 0"
          type="success"
          title="上传完成"
          closable
        >
          成功上传 {{ uploadResult.successCount }} 个文件
        </NAlert>

        <!-- 部分成功提示 -->
        <NAlert
          v-else-if="uploadResult.successCount > 0"
          type="warning"
          title="部分文件上传失败"
          closable
        >
          <div class="space-y-2">
            <div>成功上传 {{ uploadResult.successCount }} 个文件，{{ uploadResult.failedCount }} 个文件上传失败</div>
            
            <!-- 失败文件列表 -->
            <div class="mt-3 space-y-2">
              <div class="text-sm font-medium">失败文件：</div>
              <div class="max-h-40 space-y-2 overflow-y-auto">
                <div
                  v-for="(failed, index) in uploadResult.failedFiles"
                  :key="index"
                  class="rounded border border-red-700 bg-red-900/20 p-2"
                >
                  <div class="flex items-start gap-2">
                    <i class="lucide:alert-circle mt-0.5 text-red-400" />
                    <div class="flex-1 overflow-hidden">
                      <div class="truncate text-sm font-medium text-red-300" :title="failed.name">
                        {{ failed.name }}
                      </div>
                      <div class="mt-1 text-xs text-red-400">
                        {{ failed.error }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </NAlert>

        <!-- 全部失败提示 -->
        <NAlert
          v-else
          type="error"
          title="上传失败"
          closable
        >
          <div class="space-y-2">
            <div>所有文件上传失败</div>
            
            <!-- 失败文件列表 -->
            <div class="mt-3 space-y-2">
              <div class="text-sm font-medium">失败文件：</div>
              <div class="max-h-40 space-y-2 overflow-y-auto">
                <div
                  v-for="(failed, index) in uploadResult.failedFiles"
                  :key="index"
                  class="rounded border border-red-700 bg-red-900/20 p-2"
                >
                  <div class="flex items-start gap-2">
                    <i class="lucide:alert-circle mt-0.5 text-red-400" />
                    <div class="flex-1 overflow-hidden">
                      <div class="truncate text-sm font-medium text-red-300" :title="failed.name">
                        {{ failed.name }}
                      </div>
                      <div class="mt-1 text-xs text-red-400">
                        {{ failed.error }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </NAlert>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="flex justify-end gap-3">
        <NButton
          v-if="!uploadComplete"
          :disabled="uploading"
          @click="handleClose"
        >
          取消
        </NButton>
        <NButton
          v-if="uploadComplete"
          type="primary"
          @click="handleClose"
        >
          关闭
        </NButton>
        <NButton
          v-else
          type="primary"
          :disabled="uploading || fileList.length === 0 || hasValidationErrors || isRateLimited"
          :loading="uploading"
          @click="handleUpload"
        >
          {{ uploading ? '上传中...' : '开始上传' }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
/* 自定义样式 */
</style>
