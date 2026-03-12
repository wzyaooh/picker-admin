import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

export namespace StorageConfigApi {
  /** 存储类型 */
  export type StorageType = 'local' | 'object';

  /** 存储配置 */
  export interface StorageConfig {
    id: number;
    name: string;
    code?: string;
    type: StorageType;
    description?: string;
    storagePath?: string;
    accessPath?: string;
    enableRecycleBin?: boolean;
    recycleBinPath?: string;
    sort?: number;
    isDefault: boolean;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    objectConfig?: ObjectStorageConfig | null;
  }

  /** 对象存储配置 */
  export interface ObjectStorageConfig {
    id: number;
    storageConfigId: number;
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    region?: string;
    useSSL: boolean;
  }

  /** 创建存储配置参数 */
  export interface CreateStorageConfigParams {
    name: string;
    code?: string;
    type: StorageType;
    description?: string;
    storagePath?: string;
    accessPath?: string;
    enableRecycleBin?: boolean;
    recycleBinPath?: string;
    sort?: number;
    isDefault?: boolean;
    enabled?: boolean;
    // 对象存储专用字段
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket?: string;
    region?: string;
    useSSL?: boolean;
  }

  /** 更新存储配置参数 */
  export interface UpdateStorageConfigParams {
    name?: string;
    code?: string;
    description?: string;
    storagePath?: string;
    accessPath?: string;
    enableRecycleBin?: boolean;
    recycleBinPath?: string;
    sort?: number;
    isDefault?: boolean;
    enabled?: boolean;
    // 对象存储专用字段
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket?: string;
    region?: string;
    useSSL?: boolean;
  }

  /** 查询存储配置参数 */
  export interface QueryStorageConfigParams {
    type?: StorageType;
    keyword?: string;
    enabled?: boolean;
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
}

// ==================== API 函数 ====================

/**
 * 创建存储配置
 * @param params 创建参数
 */
export async function createStorageConfigApi(params: StorageConfigApi.CreateStorageConfigParams) {
  return requestClient.post<StorageConfigApi.StorageConfig>('/storage-config', params);
}

/**
 * 查询存储配置列表
 * @param params 查询参数
 */
export async function getStorageConfigListApi(params?: StorageConfigApi.QueryStorageConfigParams) {
  return requestClient.get<StorageConfigApi.PageResult<StorageConfigApi.StorageConfig>>(
    '/storage-config',
    { params }
  );
}

/**
 * 获取默认存储配置
 */
export async function getDefaultStorageConfigApi() {
  return requestClient.get<StorageConfigApi.StorageConfig>('/storage-config/default');
}

/**
 * 查询存储配置详情
 * @param id 存储配置ID
 */
export async function getStorageConfigApi(id: number) {
  return requestClient.get<StorageConfigApi.StorageConfig>(`/storage-config/${id}`);
}

/**
 * 更新存储配置
 * @param id 存储配置ID
 * @param params 更新参数
 */
export async function updateStorageConfigApi(
  id: number,
  params: StorageConfigApi.UpdateStorageConfigParams
) {
  return requestClient.patch<StorageConfigApi.StorageConfig>(`/storage-config/${id}`, params);
}

/**
 * 切换存储配置启用状态
 * @param id 存储配置ID
 */
export async function toggleStorageConfigApi(id: number) {
  return requestClient.patch<StorageConfigApi.StorageConfig>(`/storage-config/${id}/toggle`);
}

/**
 * 设置为默认存储
 * @param id 存储配置ID
 */
export async function setDefaultStorageConfigApi(id: number) {
  return requestClient.patch<StorageConfigApi.StorageConfig>(`/storage-config/${id}/set-default`);
}

/**
 * 删除存储配置
 * @param id 存储配置ID
 */
export async function deleteStorageConfigApi(id: number) {
  return requestClient.delete<boolean>(`/storage-config/${id}`);
}
