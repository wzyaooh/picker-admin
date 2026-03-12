import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================
export namespace PositionApi {
  /** 岗位信息 */
  export interface Position {
    id: number;
    code: string;
    name: string;
    description?: string;
    sort: number;
    enable: boolean;
    createTime: string;
    updateTime: string;
  }

  /** 创建岗位参数 */
  export interface CreateParams {
    code: string;
    name: string;
    description?: string;
    sort?: number;
    enable?: boolean;
  }

  /** 更新岗位参数 */
  export interface UpdateParams {
    code?: string;
    name?: string;
    description?: string;
    sort?: number;
    enable?: boolean;
  }

  /** 查询岗位参数 */
  export interface QueryParams {
    pageNo?: number;
    pageSize?: number;
    name?: string;
    code?: string;
    enable?: boolean;
  }

  /** 分页结果 */
  export interface PageResult {
    pageData: Position[];
    total: number;
  }
}

// ==================== API 函数 ====================

/**
 * 创建岗位
 * @param data 岗位数据
 */
export async function createPositionApi(data: PositionApi.CreateParams) {
  return requestClient.post<PositionApi.Position>('/position', data);
}

/**
 * 查询岗位列表
 * @param params 查询参数
 */
export async function getPositionListApi(params: PositionApi.QueryParams) {
  return requestClient.get<PositionApi.PageResult>('/position', { params });
}

/**
 * 查询岗位详情
 * @param id 岗位ID
 */
export async function getPositionApi(id: number) {
  return requestClient.get<PositionApi.Position>(`/position/${id}`);
}

/**
 * 更新岗位
 * @param id 岗位ID
 * @param data 更新数据
 */
export async function updatePositionApi(id: number, data: PositionApi.UpdateParams) {
  return requestClient.patch<PositionApi.Position>(`/position/${id}`, data);
}

/**
 * 删除岗位
 * @param id 岗位ID
 */
export async function deletePositionApi(id: number) {
  return requestClient.delete<boolean>(`/position/${id}`);
}
