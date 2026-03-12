/**
 * 文件操作通用逻辑
 */
import { message, dialog } from '#/adapter/naive';
import type { FileApi } from '#/api';
import {
  deleteFileApi,
  batchDeleteFilesApi,
  deleteFolderApi,
  completelyDeleteFileApi,
} from '#/api/modules/file';

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }
  return filename.substring(lastDotIndex + 1).toLowerCase();
}

/**
 * 刷新文件列表和统计信息
 */
export async function refreshFileData(callbacks: {
  fetchFiles: () => Promise<void>;
  fetchStorageStats: () => Promise<void>;
  fetchCategoryStats: () => Promise<void>;
}) {
  await Promise.all([
    callbacks.fetchFiles(),
    callbacks.fetchStorageStats(),
    callbacks.fetchCategoryStats(),
  ]);
}

/**
 * 删除文件（带确认对话框）
 */
export async function deleteFileWithConfirm(
  file: FileApi.FileItem,
  onSuccess: () => Promise<void>
) {
  const isFolder = file.isFolder;
  const title = isFolder ? '确认删除文件夹' : '确认删除';
  const content = isFolder 
    ? `确定要删除文件夹"${file.name}"吗？此操作将递归删除文件夹内的所有文件和子文件夹，文件将被移动到回收站。`
    : `确定要删除"${file.name}"吗？文件将被移动到回收站。`;

  dialog.warning({
    title,
    content,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        if (isFolder) {
          await deleteFolderApi(file.id);
        } else {
          await deleteFileApi(file.id);
        }
        message.success('删除成功');
        await onSuccess();
      } catch (_error) {
        // Error already handled by interceptor
      }
    },
  });
}

/**
 * 批量删除文件（带确认对话框）
 */
export async function batchDeleteFilesWithConfirm(
  selectedFiles: FileApi.FileItem[],
  onSuccess: () => Promise<void>
) {
  if (selectedFiles.length === 0) {
    message.warning('请选择要删除的文件');
    return;
  }

  const folderCount = selectedFiles.filter(f => f.isFolder).length;
  
  const fileNames = selectedFiles
    .map(f => f.name)
    .slice(0, 3)
    .join('、');
  
  const displayText = selectedFiles.length > 3 
    ? `${fileNames} 等 ${selectedFiles.length} 个项目`
    : fileNames;

  let content = `确定要删除"${displayText}"吗？`;
  if (folderCount > 0) {
    content += `\n\n包含 ${folderCount} 个文件夹，将递归删除文件夹内的所有内容。`;
  }
  content += '\n\n文件将被移动到回收站。';

  dialog.warning({
    title: '批量删除',
    content,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        // 分别处理文件和文件夹
        const folders = selectedFiles.filter(f => f.isFolder);
        const regularFiles = selectedFiles.filter(f => !f.isFolder);
        
        // 删除文件夹
        for (const folder of folders) {
          await deleteFolderApi(folder.id);
        }
        
        // 批量删除文件
        if (regularFiles.length > 0) {
          await batchDeleteFilesApi(regularFiles.map(f => f.id));
        }
        
        message.success('删除成功');
        await onSuccess();
      } catch (_error) {
        // Error already handled by interceptor
      }
    },
  });
}

/**
 * 彻底删除文件（带确认对话框）
 */
export async function permanentlyDeleteFileWithConfirm(
  file: FileApi.FileItem,
  onSuccess: () => Promise<void>
) {
  if (file.isFolder) {
    message.warning('文件夹暂不支持彻底删除，请先删除到回收站');
    return;
  }

  dialog.error({
    title: '确认彻底删除',
    content: `确定要彻底删除"${file.name}"吗？\n\n⚠️ 此操作将永久删除文件，无法恢复！`,
    positiveText: '彻底删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await completelyDeleteFileApi(file.id);
        message.success('文件已彻底删除');
        await onSuccess();
      } catch (error) {
        message.error('删除失败');
      }
    },
  });
}
