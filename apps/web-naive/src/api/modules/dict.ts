import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/**
 * 字典管理 API 命名空间
 */
export namespace DictApi {
  /**
   * 字典接口
   */
  export interface Dict {
    /** 字典ID */
    id: number;
    /** 字典编码（唯一） */
    code: string;
    /** 字典名称 */
    name: string;
    /** 字典描述 */
    description?: string;
    /** 是否启用 */
    enable: boolean;
    /** 创建时间 */
    createdAt: string;
    /** 更新时间 */
    updatedAt: string;
  }

  /**
   * 字典项接口
   */
  export interface DictItem {
    /** 字典项ID */
    id: number;
    /** 所属字典ID */
    dictId: number;
    /** 字典项标签（显示文本） */
    label: string;
    /** 字典项值（实际值） */
    value: string;
    /** 颜色标签 */
    color?: string;
    /** 描述 */
    description?: string;
    /** 排序值 */
    sort: number;
    /** 是否启用 */
    enable: boolean;
    /** 创建时间 */
    createdAt: string;
    /** 更新时间 */
    updatedAt: string;
  }

  /**
   * 创建字典参数
   */
  export interface CreateDictParams {
    /** 字典编码（唯一，只能包含字母、数字和下划线） */
    code: string;
    /** 字典名称 */
    name: string;
    /** 字典描述 */
    description?: string;
    /** 是否启用 */
    enable?: boolean;
  }

  /**
   * 更新字典参数
   */
  export interface UpdateDictParams {
    /** 字典编码 */
    code?: string;
    /** 字典名称 */
    name?: string;
    /** 字典描述 */
    description?: string;
    /** 是否启用 */
    enable?: boolean;
  }

  /**
   * 查询字典参数
   */
  export interface QueryDictParams {
    /** 页码 */
    pageNo?: number;
    /** 每页数量 */
    pageSize?: number;
    /** 搜索关键字（匹配 name 或 code） */
    keyword?: string;
    /** 启用状态过滤 */
    enable?: boolean;
  }

  /**
   * 创建字典项参数
   */
  export interface CreateDictItemParams {
    /** 字典项标签 */
    label: string;
    /** 字典项值 */
    value: string;
    /** 颜色标签 */
    color?: string;
    /** 描述 */
    description?: string;
    /** 排序值 */
    sort?: number;
    /** 是否启用 */
    enable?: boolean;
  }

  /**
   * 更新字典项参数
   */
  export interface UpdateDictItemParams {
    /** 字典项标签 */
    label?: string;
    /** 字典项值 */
    value?: string;
    /** 颜色标签 */
    color?: string;
    /** 描述 */
    description?: string;
    /** 排序值 */
    sort?: number;
    /** 是否启用 */
    enable?: boolean;
  }

  /**
   * 分页结果泛型接口
   */
  export interface PageResult<T> {
    /** 数据列表 */
    pageData: T[];
    /** 总数 */
    total: number;
  }
}

// ==================== API 函数 ====================

/**
 * 创建字典
 * @param data 创建参数
 */
export async function createDictApi(data: DictApi.CreateDictParams) {
  return requestClient.post<DictApi.Dict>('/dict', data);
}

/**
 * 获取字典列表（分页）
 * @param params 查询参数
 */
export async function getDictListApi(params: DictApi.QueryDictParams) {
  return requestClient.get<DictApi.PageResult<DictApi.Dict>>('/dict', {
    params,
  });
}

/**
 * 获取所有字典（不分页）
 */
export async function getAllDictsApi() {
  return requestClient.get<DictApi.Dict[]>('/dict/all');
}

/**
 * 获取字典详情
 * @param id 字典ID
 */
export async function getDictApi(id: number) {
  return requestClient.get<DictApi.Dict>(`/dict/${id}`);
}

/**
 * 根据编码获取字典
 * @param code 字典编码
 */
export async function getDictByCodeApi(code: string) {
  return requestClient.get<DictApi.Dict>(`/dict/code/${code}`);
}

/**
 * 更新字典
 * @param id 字典ID
 * @param data 更新参数
 */
export async function updateDictApi(
  id: number,
  data: DictApi.UpdateDictParams,
) {
  return requestClient.patch<DictApi.Dict>(`/dict/${id}`, data);
}

/**
 * 删除字典
 * @param id 字典ID
 */
export async function deleteDictApi(id: number) {
  return requestClient.delete<boolean>(`/dict/${id}`);
}

/**
 * 创建字典项
 * @param dictId 字典ID
 * @param data 创建参数
 */
export async function createDictItemApi(
  dictId: number,
  data: DictApi.CreateDictItemParams,
) {
  return requestClient.post<DictApi.DictItem>(`/dict/${dictId}/items`, data);
}

/**
 * 获取字典项列表
 * @param dictId 字典ID
 */
export async function getDictItemsApi(dictId: number) {
  return requestClient.get<DictApi.DictItem[]>(`/dict/${dictId}/items`);
}

/**
 * 根据字典编码获取字典项列表
 * @param code 字典编码
 */
export async function getDictItemsByCodeApi(code: string) {
  return requestClient.get<DictApi.DictItem[]>(`/dict/code/${code}/items`);
}

/**
 * 更新字典项
 * @param dictId 字典ID
 * @param itemId 字典项ID
 * @param data 更新参数
 */
export async function updateDictItemApi(
  dictId: number,
  itemId: number,
  data: DictApi.UpdateDictItemParams,
) {
  return requestClient.patch<DictApi.DictItem>(
    `/dict/${dictId}/items/${itemId}`,
    data,
  );
}

/**
 * 删除字典项
 * @param dictId 字典ID
 * @param itemId 字典项ID
 */
export async function deleteDictItemApi(dictId: number, itemId: number) {
  return requestClient.delete<boolean>(`/dict/${dictId}/items/${itemId}`);
}
