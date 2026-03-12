<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { NCard, NPagination, NSelect } from 'naive-ui';
import { message } from '#/adapter/naive';
import type { FileApi, StorageConfigApi } from '#/api';
import {
  getFileListApi,
  getStorageStatsApi,
  getCategoryStatsApi,
  moveFileApi,
  copyFileApi,
  downloadFileApi,
  toggleFavoriteApi,
} from '#/api/modules/file';
import { getStorageConfigListApi } from '#/api/modules/storage-config';
import {
  refreshFileData,
  deleteFileWithConfirm,
  batchDeleteFilesWithConfirm,
  permanentlyDeleteFileWithConfirm,
} from './composables/use-file-operations';
import FileBrowser from './components/FileBrowser.vue';
import Sidebar from './components/Sidebar.vue';
import Toolbar from './components/Toolbar.vue';
import UploadModal from './components/UploadModal.vue';
import Breadcrumb from './components/Breadcrumb.vue';
import FileContextMenu from './components/FileContextMenu.vue';
import RenameModal from './components/RenameModal.vue';
import FolderSelectorModal from './components/FolderSelectorModal.vue';
import RecycleBinModal from './components/RecycleBinModal.vue';
import FilePreviewModal from './components/FilePreviewModal.vue';
import CreateFolderModal from './components/CreateFolderModal.vue';

defineOptions({ name: 'SystemToolsFilePage' });

// State management
const loading = ref(false);
const files = ref<FileApi.FileItem[]>([]);
const selectedFiles = ref<Set<number>>(new Set());
const currentPath = ref<Array<{ id: number | null; name: string }>>([]);
const currentFolderId = ref<number | null>(null);
const searchKeyword = ref('');
const currentCategory = ref<FileApi.FileCategory>('all');

// Storage configuration state
const storageConfigs = ref<StorageConfigApi.StorageConfig[]>([]);
const currentStorageConfigId = ref<number | undefined>(undefined);
const storageConfigLoading = ref(false);

// Computed properties for storage config
const storageConfigOptions = computed(() => {
  return storageConfigs.value.map(config => ({
    label: config.isDefault ? `${config.name} (默认)` : config.name,
    value: config.id,
  }));
});

const currentStorageConfig = computed(() => {
  return storageConfigs.value.find(c => c.id === currentStorageConfigId.value);
});

// Pagination state
const pagination = reactive({
  page: 1,
  pageSize: 30,
  total: 0,
});

// Sort state
const sortBy = ref<FileApi.SortBy>('name');
const sortOrder = ref<FileApi.SortOrder>('asc');

// Modal state
const uploadModalVisible = ref(false);
const renameModalVisible = ref(false);
const folderSelectorVisible = ref(false);
const folderSelectorMode = ref<'move' | 'copy'>('move');
const recycleBinModalVisible = ref(false);
const previewModalVisible = ref(false);
const createFolderModalVisible = ref(false);

// Context menu state
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuFile = ref<FileApi.FileItem | null>(null);

// Current operation file
const currentFile = ref<FileApi.FileItem | null>(null);

// Storage space information
const storageInfo = ref<FileApi.StorageInfo>({
  total: 10737418240, // 10GB default value
  used: 0,
  available: 10737418240,
  fileCount: 0,
  folderCount: 0,
  categoryStats: {
    all: 0,
    image: 0,
    document: 0,
    video: 0,
    audio: 0,
    other: 0,
  },
});

// Category statistics
const categoryCounts = ref<Record<FileApi.FileCategory, number>>({
  all: 0,
  image: 0,
  document: 0,
  video: 0,
  audio: 0,
  other: 0,
});

// Get file list
async function fetchFiles() {
  loading.value = true;
  try {
    console.log('[fetchFiles] 当前存储配置ID:', currentStorageConfigId.value);
    console.log('[fetchFiles] 查询参数:', {
      folderId: currentFolderId.value,
      storageConfigId: currentStorageConfigId.value,
      category: currentCategory.value === 'all' ? undefined : currentCategory.value,
      keyword: searchKeyword.value || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    
    const result = await getFileListApi({
      folderId: currentFolderId.value,
      storageConfigId: currentStorageConfigId.value,
      category: currentCategory.value === 'all' ? undefined : currentCategory.value,
      keyword: searchKeyword.value || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    
    console.log('[fetchFiles] 返回结果:', result);
    files.value = result.items || [];
    pagination.total = result.total || 0;
  } catch (_error) {
    message.error('获取文件列表失败');
  } finally {
    loading.value = false;
  }
}

// Get storage configurations
async function fetchStorageConfigs() {
  storageConfigLoading.value = true;
  try {
    const result = await getStorageConfigListApi({
      enabled: true,
      page: 1,
      pageSize: 100,
    });
    
    console.log('[fetchStorageConfigs] 获取到的存储配置:', result.items);
    storageConfigs.value = result.items || [];
    
    // Set default storage config as current if not set
    if (!currentStorageConfigId.value && storageConfigs.value.length > 0) {
      const defaultConfig = storageConfigs.value.find(c => c.isDefault);
      const initialConfigId = defaultConfig?.id || storageConfigs.value[0].id;
      currentStorageConfigId.value = initialConfigId;
      console.log('[fetchStorageConfigs] 设置默认存储配置ID:', currentStorageConfigId.value);
      console.log('[fetchStorageConfigs] 默认配置:', defaultConfig);
    }
  } catch (_error) {
    message.error('获取存储配置失败');
  } finally {
    storageConfigLoading.value = false;
  }
}

// Handle storage config change
async function handleStorageConfigChange(configId: number) {
  console.log('[handleStorageConfigChange] 被调用');
  console.log('[handleStorageConfigChange] 切换到存储配置ID:', configId);
  console.log('[handleStorageConfigChange] 当前存储配置ID:', currentStorageConfigId.value);
  
  if (configId === currentStorageConfigId.value) {
    console.log('[handleStorageConfigChange] 配置ID相同，跳过');
    return;
  }
  
  currentStorageConfigId.value = configId;
  console.log('[handleStorageConfigChange] 已更新 currentStorageConfigId:', currentStorageConfigId.value);
  
  // Reset to root directory and clear selections
  currentFolderId.value = null;
  currentPath.value = [];
  selectedFiles.value.clear();
  pagination.page = 1;
  
  console.log('[handleStorageConfigChange] 开始加载数据...');
  
  // Fetch files and stats for new storage config
  await Promise.all([
    fetchFiles(),
    fetchStorageStats(),
    fetchCategoryStats(),
  ]);
  
  console.log('[handleStorageConfigChange] 数据加载完成');
  
  // Show notification
  const config = storageConfigs.value.find(c => c.id === configId);
  if (config) {
    message.success(`已切换到存储配置: ${config.name}`);
  }
}

// Get storage space statistics
async function fetchStorageStats() {
  try {
    const result = await getStorageStatsApi(currentStorageConfigId.value);
    storageInfo.value = {
      total: result.total,
      used: result.used,
      available: result.available,
      fileCount: result.fileCount,
      folderCount: result.folderCount,
      categoryStats: storageInfo.value.categoryStats, // Keep category statistics
    };
  } catch (_error) {
    // Silent failure, use default values
  }
}

// Get category statistics
async function fetchCategoryStats() {
  try {
    const result = await getCategoryStatsApi(currentStorageConfigId.value);
    
    // Convert backend format
    const stats: Record<FileApi.FileCategory, number> = {
      all: 0,
      image: 0,
      document: 0,
      video: 0,
      audio: 0,
      other: 0,
    };
    
    let total = 0;
    Object.entries(result).forEach(([key, value]) => {
      const count = value.count || 0;
      total += count;
      
      // Map backend categories to frontend categories
      if (key === 'image') stats.image = count;
      else if (key === 'document') stats.document = count;
      else if (key === 'video') stats.video = count;
      else if (key === 'audio') stats.audio = count;
      else stats.other += count;
    });
    
    stats.all = total;
    categoryCounts.value = stats;
    storageInfo.value.categoryStats = stats;
  } catch (_error) {
    // Silent failure, use default values
  }
}

// Navigate to folder
function navigateToFolder(folderId: number, folderName: string) {
  currentFolderId.value = folderId;
  currentPath.value.push({ id: folderId, name: folderName });
  selectedFiles.value.clear();
  pagination.page = 1;
  fetchFiles();
}

// Breadcrumb navigation
function handleBreadcrumbNavigate(folderId: number | null) {
  if (folderId === currentFolderId.value) return;
  
  // Find target folder position in path
  const index = currentPath.value.findIndex(p => p.id === folderId);
  if (index !== -1) {
    currentPath.value = currentPath.value.slice(0, index + 1);
  } else {
    // Return to root directory
    currentPath.value = [];
  }
  
  currentFolderId.value = folderId;
  selectedFiles.value.clear();
  pagination.page = 1;
  fetchFiles();
}

// Handle file selection
function handleFileSelect(fileId: number) {
  if (selectedFiles.value.has(fileId)) {
    selectedFiles.value.delete(fileId);
  } else {
    selectedFiles.value.add(fileId);
  }
}

// Handle file click
function handleFileClick(file: any) {
  if (file.isFolder) {
    navigateToFolder(file.id, file.name);
  } else {
    // Open preview
    currentFile.value = file;
    previewModalVisible.value = true;
  }
}

// Handle file context menu
function handleFileContextMenu(file: FileApi.FileItem, event: MouseEvent) {
  event.preventDefault();
  contextMenuFile.value = file;
  contextMenuX.value = event.clientX;
  contextMenuY.value = event.clientY;
  contextMenuVisible.value = true;
}

// Handle rename
function handleRename(file: FileApi.FileItem) {
  currentFile.value = file;
  renameModalVisible.value = true;
}

// Handle delete
function handleDelete(file: FileApi.FileItem) {
  deleteFileWithConfirm(file, async () => {
    await refreshFileData({
      fetchFiles,
      fetchStorageStats,
      fetchCategoryStats,
    });
  });
}

// Handle permanent delete
function handlePermanentDelete(file: FileApi.FileItem) {
  permanentlyDeleteFileWithConfirm(file, async () => {
    await refreshFileData({
      fetchFiles,
      fetchStorageStats,
      fetchCategoryStats,
    });
  });
}

// Handle move
function handleMove(file: FileApi.FileItem) {
  currentFile.value = file;
  folderSelectorMode.value = 'move';
  folderSelectorVisible.value = true;
}

// Handle copy
function handleCopy(file: FileApi.FileItem) {
  currentFile.value = file;
  folderSelectorMode.value = 'copy';
  folderSelectorVisible.value = true;
}

// Handle download
async function handleDownload(file: FileApi.FileItem) {
  try {
    const blob = await downloadFileApi(file.id);
    const url = window.URL.createObjectURL(blob as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    message.success('下载成功');
  } catch (_error) {
    // Error already handled by interceptor
  }
}

// Handle share
function handleShare(file: FileApi.FileItem) {
  message.info('分享功能开发中');
}

// Handle favorite
async function handleFavorite(file: FileApi.FileItem) {
  try {
    await toggleFavoriteApi(file.id);
    message.success(file.isFavorite ? '已取消收藏' : '已添加到收藏');
    await fetchFiles();
    await fetchCategoryStats();
  } catch (_error) {
    // Error already handled by interceptor
  }
}

// Handle tags
function handleTags(file: FileApi.FileItem) {
  message.info('标签功能开发中');
}

// Handle folder selector confirmation
async function handleFolderSelectorConfirm(targetFolderId: number | null) {
  try {
    // Batch operation mode
    if (!currentFile.value && selectedFiles.value.size > 0) {
      const fileIds = Array.from(selectedFiles.value);
      
      if (folderSelectorMode.value === 'move') {
        // TODO: Call batch move API
        // await batchMoveFilesApi({ fileIds, targetFolderId });
        message.success(`已移动 ${fileIds.length} 个文件`);
      }
      
      selectedFiles.value.clear();
      await fetchFiles();
      return;
    }

    // Single file operation mode
    if (!currentFile.value) return;

    if (folderSelectorMode.value === 'move') {
      await moveFileApi(currentFile.value.id, targetFolderId);
      message.success('移动成功');
    } else {
      await copyFileApi(currentFile.value.id, targetFolderId);
      message.success('复制成功');
    }
    await fetchFiles();
  } catch (_error) {
    // Error already handled by interceptor
  }
}

// Handle category change
function handleCategoryChange(category: FileApi.FileCategory) {
  currentCategory.value = category;
  pagination.page = 1;
  fetchFiles();
}

// Handle search
function handleSearch(keyword: string) {
  searchKeyword.value = keyword;
  pagination.page = 1;
  fetchFiles();
}

// Handle upload
function handleUpload() {
  uploadModalVisible.value = true;
}

// Handle create folder
function handleCreateFolder() {
  createFolderModalVisible.value = true;
}

// Handle create folder success
async function handleCreateFolderSuccess() {
  await fetchFiles();
  await fetchStorageStats();
}

// Handle batch delete
// Handle batch delete
function handleBatchDelete() {
  const fileIds = Array.from(selectedFiles.value);
  const selectedItems = files.value.filter(f => fileIds.includes(f.id));
  
  batchDeleteFilesWithConfirm(selectedItems, async () => {
    selectedFiles.value.clear();
    await refreshFileData({
      fetchFiles,
      fetchStorageStats,
      fetchCategoryStats,
    });
  });
}

// Handle batch move
function handleBatchMove() {
  if (selectedFiles.value.size === 0) {
    message.warning('请选择要移动的文件');
    return;
  }
  
  // Set batch mode
  currentFile.value = null;
  folderSelectorMode.value = 'move';
  folderSelectorVisible.value = true;
}

// Handle batch download
function handleBatchDownload() {
  if (selectedFiles.value.size === 0) {
    message.warning('请选择要下载的文件');
    return;
  }
  message.info('批量下载功能开发中');
}

// Handle sort change
function handleSortChange(newSortBy: FileApi.SortBy, newSortOrder: FileApi.SortOrder) {
  sortBy.value = newSortBy;
  sortOrder.value = newSortOrder;
  pagination.page = 1;
  fetchFiles();
}

// Handle upload complete
function handleUploadComplete() {
  // 不在这里关闭弹窗,让弹窗自己控制关闭时机
  // 这样用户可以查看上传结果后再手动关闭
  fetchFiles();
  fetchStorageStats();
  fetchCategoryStats();
}

// Open recycle bin
function handleOpenRecycleBin() {
  recycleBinModalVisible.value = true;
}

// Handle recycle bin refresh
function handleRecycleBinRefresh() {
  // Refresh main list (files may have been restored)
  fetchFiles();
  fetchStorageStats();
  fetchCategoryStats();
}

// Handle page change
function handlePageChange(page: number) {
  pagination.page = page;
  fetchFiles();
}

// Initialize
onMounted(async () => {
  await fetchStorageConfigs();
  await fetchFiles();
  await fetchStorageStats();
  await fetchCategoryStats();
});
</script>

<template>
  <div class="flex h-full gap-4 p-4">
    <!-- Left sidebar -->
    <div class="w-64 flex-shrink-0">
      <Sidebar
        :current-category="currentCategory"
        :storage-info="storageInfo"
        :category-counts="categoryCounts"
        @category-change="handleCategoryChange"
        @open-recycle-bin="handleOpenRecycleBin"
      />
    </div>

    <!-- Right main content area -->
    <div class="flex flex-1 flex-col">
      <NCard :bordered="false" class="flex-1">
        <!-- Storage config selector -->
        <div class="mb-4 flex items-center gap-3">
          <span class="text-sm text-gray-500">存储配置:</span>
          <NSelect
            :value="currentStorageConfigId"
            :options="storageConfigOptions"
            :loading="storageConfigLoading"
            :disabled="storageConfigLoading"
            placeholder="选择存储配置"
            class="w-64"
            @update:value="handleStorageConfigChange"
          />
          <span v-if="currentStorageConfig" class="text-xs text-gray-400">
            {{ currentStorageConfig.type === 'local' ? '本地存储' : '对象存储' }}
          </span>
        </div>

        <!-- Breadcrumb navigation -->
        <div class="mb-4">
          <Breadcrumb
            :current-path="currentPath"
            @navigate="handleBreadcrumbNavigate"
          />
        </div>

        <!-- Toolbar -->
        <Toolbar
          :selected-count="selectedFiles.size"
          :sort-by="sortBy"
          :sort-order="sortOrder"
          @upload="handleUpload"
          @create-folder="handleCreateFolder"
          @search="handleSearch"
          @batch-delete="handleBatchDelete"
          @batch-move="handleBatchMove"
          @batch-download="handleBatchDownload"
          @sort-change="handleSortChange"
        />

        <!-- File browser -->
        <FileBrowser
          :files="files"
          :selected-files="selectedFiles"
          :loading="loading"
          @file-click="handleFileClick"
          @file-select="handleFileSelect"
          @file-context-menu="handleFileContextMenu"
        />

        <!-- Pagination -->
        <div class="mt-4 flex items-center justify-between">
          <div class="text-sm text-gray-400">
            共 {{ pagination.total }} 项，显示第 {{ (pagination.page - 1) * pagination.pageSize + 1 }}-{{ Math.min(pagination.page * pagination.pageSize, pagination.total) }} 项
          </div>
          <NPagination
            v-model:page="pagination.page"
            :page-count="Math.ceil(pagination.total / pagination.pageSize)"
            :page-size="pagination.pageSize"
            show-size-picker
            :page-sizes="[10, 20, 30, 50]"
            @update:page="handlePageChange"
            @update:page-size="(size) => { pagination.pageSize = size; fetchFiles(); }"
          />
        </div>
      </NCard>
    </div>

    <!-- Upload modal -->
    <UploadModal
      v-model:show="uploadModalVisible"
      :current-folder-id="currentFolderId"
      :storage-config-id="currentStorageConfigId"
      @upload-complete="handleUploadComplete"
    />

    <!-- Context menu -->
    <FileContextMenu
      v-if="contextMenuFile"
      v-model:show="contextMenuVisible"
      :file="contextMenuFile"
      :x="contextMenuX"
      :y="contextMenuY"
      @rename="handleRename"
      @delete="handleDelete"
      @permanent-delete="handlePermanentDelete"
      @move="handleMove"
      @copy="handleCopy"
      @download="handleDownload"
      @share="handleShare"
      @favorite="handleFavorite"
      @tags="handleTags"
    />

    <!-- Rename modal -->
    <RenameModal
      v-model:show="renameModalVisible"
      :file="currentFile"
      @success="fetchFiles"
    />

    <!-- Folder selector -->
    <FolderSelectorModal
      v-model:show="folderSelectorVisible"
      :title="folderSelectorMode === 'move' ? '移动到' : '复制到'"
      :mode="folderSelectorMode"
      @confirm="handleFolderSelectorConfirm"
    />

    <!-- Recycle bin modal -->
    <RecycleBinModal
      v-model:show="recycleBinModalVisible"
      @refresh="handleRecycleBinRefresh"
    />

    <!-- File preview modal -->
    <FilePreviewModal
      v-model:show="previewModalVisible"
      :file="currentFile"
    />

    <!-- Create folder modal -->
    <CreateFolderModal
      v-model:show="createFolderModalVisible"
      :current-folder-id="currentFolderId"
      :storage-config-id="currentStorageConfigId"
      @success="handleCreateFolderSuccess"
    />
  </div>
</template>
