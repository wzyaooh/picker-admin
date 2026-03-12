import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

export namespace FileApi {
  /** 文件类别 */
  export type FileCategory = 'all' | 'image' | 'document' | 'video' | 'audio' | 'other';

  /** 排序字段 */
  export type SortBy = 'name' | 'size' | 'date' | 'type';

  /** 排序顺序 */
  export type SortOrder = 'asc' | 'desc';

  /** 存储类型 */
  export type StorageType = 'local' | 'object';

  /** 文件项 */
  export interface FileItem {
    id: number;
    name: string;
    originalName: string;
    size: number;
    mimeType: string;
    extension: string;
    path: string;
    url: string;
    storageConfigId: number;
    storageType: StorageType;
    folderId: number | null;
    userId: number;
    isFolder: boolean;
    isDeleted: boolean;
    deletedAt: string | null;
    isFavorite: boolean;
    tags: string[];
    version: number;
    parentVersionId: number | null;
    md5: string;
    createdAt: string;
    updatedAt: string;
  }

  /** 文件夹 */
  export interface Folder {
    id: number;
    name: string;
    parentId: number | null;
    userId: number;
    path: string;
    isDeleted: boolean;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }

  /** 文件列表查询参数 */
  export interface FileListParams {
    folderId?: number | null;
    storageConfigId?: number;
    category?: FileCategory;
    keyword?: string;
    sortBy?: SortBy;
    sortOrder?: SortOrder;
    page?: number;
    pageSize?: number;
  }

  /** 分页结果 */
  export interface PageResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
  }

  /** 上传文件参数 */
  export interface UploadParams {
    file: File;
    folderId?: number | null;
    storageConfigId?: number | null;
  }

  /** 上传结果 */
  export interface UploadResult {
    id: number;
    name: string;
    size: number;
    type: string;
    url: string;
    md5: string;
  }

  /** 创建文件夹参数 */
  export interface CreateFolderParams {
    name: string;
    parentId?: number | null;
    storageConfigId?: number;
  }

  /** 重命名参数 */
  export interface RenameParams {
    name: string;
  }

  /** 移动文件参数 */
  export interface MoveFilesParams {
    fileIds: number[];
    targetFolderId: number | null;
  }

  /** 复制文件参数 */
  export interface CopyFilesParams {
    fileIds: number[];
    targetFolderId: number | null;
  }

  /** 存储空间信息 */
  export interface StorageInfo {
    total: number;
    used: number;
    available: number;
    fileCount: number;
    folderCount: number;
    categoryStats: Record<FileCategory, number>;
  }

  /** 文件分享参数 */
  export interface CreateShareParams {
    fileId: number;
    expiresAt?: string | null;
    password?: string | null;
  }

  /** 文件分享结果 */
  export interface ShareResult {
    shareId: string;
    shareUrl: string;
    expiresAt: string | null;
  }

  /** 文件分享信息 */
  export interface ShareInfo extends ShareResult {
    fileId: number;
    userId: number;
    password: string | null;
    accessCount: number;
    createdAt: string;
  }

  /** 文件版本 */
  export interface FileVersion {
    id: number;
    fileId: number;
    version: number;
    size: number;
    path: string;
    url: string;
    storageConfigId: number;
    storageType: StorageType;
    createdBy: number;
    createdAt: string;
  }

  /** 添加标签参数 */
  export interface AddTagsParams {
    fileId: number;
    tags: string[];
  }
}

// ==================== 文件列表和查询 ====================

/**
 * 获取文件列表
 * @param params 查询参数
 */
export async function getFileListApi(params: FileApi.FileListParams) {
  return requestClient.get<FileApi.PageResult<FileApi.FileItem>>(
    '/file/list',
    { params }
  );
}

/**
 * 获取文件详情
 * @param id 文件ID
 */
export async function getFileApi(id: number) {
  return requestClient.get<FileApi.FileItem>(`/file/${id}`);
}

// ==================== 文件上传 ====================

/**
 * 上传文件
 * @param params 上传参数
 */
export async function uploadFileApi(params: FileApi.UploadParams) {
  const formData = new FormData();
  formData.append('file', params.file);
  if (params.folderId !== undefined && params.folderId !== null) {
    formData.append('folderId', params.folderId.toString());
  }
  if (params.storageConfigId !== undefined && params.storageConfigId !== null) {
    formData.append('storageConfigId', params.storageConfigId.toString());
  }

  return requestClient.post<FileApi.UploadResult>('/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 批量上传文件
 * @param files 文件列表
 * @param folderId 文件夹ID
 */
export async function batchUploadFilesApi(files: File[], folderId?: number | null) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  if (folderId !== undefined && folderId !== null) {
    formData.append('folderId', folderId.toString());
  }

  return requestClient.post<FileApi.UploadResult[]>('/file/upload/batch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

// ==================== 文件夹管理 ====================

/**
 * 创建文件夹
 * @param params 创建参数
 */
export async function createFolderApi(params: FileApi.CreateFolderParams) {
  return requestClient.post<FileApi.Folder>('/file/folder', params);
}

/**
 * 获取文件夹详情
 * @param id 文件夹ID
 */
export async function getFolderApi(id: number) {
  return requestClient.get<FileApi.Folder>(`/file/folder/${id}`);
}

// ==================== 文件操作 ====================

/**
 * 重命名文件
 * @param id 文件ID
 * @param newName 新文件名
 */
export async function renameFileApi(id: number, newName: string) {
  return requestClient.patch<FileApi.FileItem>(`/file/${id}/rename`, { 
    newName: newName 
  });
}

/**
 * 重命名文件夹
 * @param id 文件夹ID
 * @param newName 新文件夹名
 */
export async function renameFolderApi(id: number, newName: string) {
  return requestClient.patch<FileApi.Folder>(`/file/folder/${id}/rename`, { 
    newName: newName 
  });
}

/**
 * 删除文件
 * @param id 文件ID
 */
export async function deleteFileApi(id: number) {
  return requestClient.delete<boolean>(`/file/${id}`);
}

/**
 * 批量删除文件
 * @param fileIds 文件ID列表
 */
export async function batchDeleteFilesApi(fileIds: number[]) {
  return requestClient.post<boolean>('/file/batch-delete', { fileIds });
}

/**
 * 移动文件
 * @param id 文件ID
 * @param targetFolderId 目标文件夹ID
 */
export async function moveFileApi(id: number, targetFolderId: number | null) {
  return requestClient.patch<FileApi.FileItem>(`/file/${id}/move`, { targetFolderId });
}

/**
 * 复制文件
 * @param id 文件ID
 * @param targetFolderId 目标文件夹ID
 */
export async function copyFileApi(id: number, targetFolderId: number | null) {
  return requestClient.post<FileApi.FileItem>(`/file/${id}/copy`, { targetFolderId });
}

/**
 * 下载文件
 * @param id 文件ID
 */
export async function downloadFileApi(id: number) {
  return requestClient.get(`/file/${id}/download`, {
    responseType: 'blob',
  });
}

/**
 * 删除文件夹
 * @param id 文件夹ID
 */
export async function deleteFolderApi(id: number) {
  return requestClient.delete<boolean>(`/file/folder/${id}`);
}

/**
 * 获取文件夹列表
 * @param parentId 父文件夹ID
 */
export async function getFolderListApi(parentId: number | null) {
  return requestClient.get<FileApi.Folder[]>('/file/folder/list', {
    params: { parentId },
  });
}

/**
 * 获取文件夹树
 */
export async function getFolderTreeApi() {
  return requestClient.get<FileApi.Folder[]>('/file/folder/tree');
}

/**
 * 批量下载文件
 * @param fileIds 文件ID列表
 */
export async function batchDownloadFilesApi(fileIds: number[]) {
  return requestClient.post('/file/download/batch', { fileIds }, {
    responseType: 'blob',
  });
}

// ==================== 存储空间 ====================

/**
 * 获取存储空间统计
 * @param storageConfigId 存储配置ID（可选）
 */
export async function getStorageStatsApi(storageConfigId?: number) {
  return requestClient.get<{
    total: number;
    used: number;
    available: number;
    usagePercent: number;
    fileCount: number;
    folderCount: number;
    totalFormatted: string;
    usedFormatted: string;
    availableFormatted: string;
  }>('/file/stats/storage', {
    params: storageConfigId !== undefined ? { storageConfigId } : undefined,
  });
}

/**
 * 获取分类统计
 * @param storageConfigId 存储配置ID（可选）
 */
export async function getCategoryStatsApi(storageConfigId?: number) {
  return requestClient.get<Record<string, { count: number; size: number }>>(
    '/file/stats/category',
    {
      params: storageConfigId !== undefined ? { storageConfigId } : undefined,
    }
  );
}

// ==================== 回收站 ====================

/**
 * 获取回收站列表
 * @param params 查询参数
 */
export async function getRecycleBinListApi(params?: { page?: number; pageSize?: number }) {
  return requestClient.get<FileApi.PageResult<FileApi.FileItem>>('/file/recycle-bin', { params });
}

/**
 * 恢复文件
 * @param id 文件ID
 */
export async function restoreFileApi(id: number) {
  return requestClient.post<FileApi.FileItem>(`/file/${id}/restore`);
}

/**
 * 永久删除文件（从回收站）
 * @param id 文件ID
 */
export async function permanentlyDeleteFileApi(id: number) {
  return requestClient.delete<boolean>(`/file/${id}/permanent`);
}

/**
 * 彻底删除文件（直接删除，不经过回收站）
 * @param id 文件ID
 */
export async function completelyDeleteFileApi(id: number) {
  return requestClient.delete<boolean>(`/file/${id}/completely`);
}

/**
 * 清空回收站
 */
export async function emptyRecycleBinApi() {
  return requestClient.delete<boolean>('/file/recycle-bin/empty');
}

/**
 * 恢复文件夹（从回收站）
 * @param id 文件夹ID
 */
export async function restoreFolderApi(id: number) {
  return requestClient.post<FileApi.Folder>(`/file/folder/${id}/restore`);
}

/**
 * 永久删除文件夹（从回收站）
 * @param id 文件夹ID
 */
export async function permanentlyDeleteFolderApi(id: number) {
  return requestClient.delete<boolean>(`/file/folder/${id}/permanent`);
}

// ==================== 文件分享 ====================

/**
 * 创建文件分享
 * @param params 分享参数
 */
export async function createShareApi(params: FileApi.CreateShareParams) {
  return requestClient.post<FileApi.ShareResult>('/file/share', params);
}

/**
 * 获取分享列表
 */
export async function getShareListApi() {
  return requestClient.get<FileApi.ShareInfo[]>('/file/share/list');
}

/**
 * 获取分享详情
 * @param shareId 分享ID
 */
export async function getShareApi(shareId: string) {
  return requestClient.get<FileApi.ShareInfo>(`/file/share/${shareId}`);
}

/**
 * 删除分享
 * @param shareId 分享ID
 */
export async function deleteShareApi(shareId: string) {
  return requestClient.delete<boolean>(`/file/share/${shareId}`);
}

// ==================== 文件版本 ====================

/**
 * 获取文件版本列表
 * @param fileId 文件ID
 */
export async function getFileVersionsApi(fileId: number) {
  return requestClient.get<FileApi.FileVersion[]>(`/file/versions/${fileId}`);
}

/**
 * 恢复文件版本
 * @param fileId 文件ID
 * @param versionId 版本ID
 */
export async function restoreFileVersionApi(fileId: number, versionId: number) {
  return requestClient.post<boolean>('/file/version/restore', {
    fileId,
    versionId,
  });
}

// ==================== 文件标签和收藏 ====================

/**
 * 添加文件标签
 * @param id 文件ID
 * @param tags 标签列表
 */
export async function addFileTagsApi(id: number, tags: string[]) {
  return requestClient.post<FileApi.FileItem>(`/file/${id}/tags`, { tags });
}

/**
 * 移除文件标签
 * @param id 文件ID
 * @param tags 标签列表
 */
export async function removeFileTagsApi(id: number, tags: string[]) {
  return requestClient.delete<FileApi.FileItem>(`/file/${id}/tags`, { data: { tags } });
}

/**
 * 按标签查询文件
 * @param tags 标签列表
 * @param params 查询参数
 */
export async function getFilesByTagsApi(tags: string[], params?: { page?: number; pageSize?: number }) {
  return requestClient.get<FileApi.PageResult<FileApi.FileItem>>('/file/tags/search', {
    params: { tags: tags.join(','), ...params },
  });
}

/**
 * 切换收藏状态
 * @param id 文件ID
 */
export async function toggleFavoriteApi(id: number) {
  return requestClient.post<FileApi.FileItem>(`/file/${id}/favorite`);
}

/**
 * 获取收藏列表
 * @param params 查询参数
 */
export async function getFavoriteListApi(params?: { page?: number; pageSize?: number }) {
  return requestClient.get<FileApi.PageResult<FileApi.FileItem>>('/file/favorites', { params });
}
