import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================
export namespace DepartmentApi {
  /** 部门信息 */
  export interface Department {
    id: number;
    code: string;
    name: string;
    description?: string;
    parentId?: number | null;
    leaderId?: number | null;
    order: number;
    enable: boolean;
    createTime: string;
    updateTime: string;
    children?: Department[];
  }

  /** 创建部门参数 */
  export interface CreateDepartmentParams {
    code: string;
    name: string;
    description?: string;
    parentId?: number | null;
    leaderId?: number | null;
    order?: number;
    enable?: boolean;
  }

  /** 更新部门参数 */
  export interface UpdateDepartmentParams {
    code?: string;
    name?: string;
    description?: string;
    parentId?: number | null;
    leaderId?: number | null;
    order?: number;
    enable?: boolean;
  }

  /** 查询部门参数 */
  export interface QueryDepartmentParams {
    name?: string;
    enable?: boolean;
  }
}

// ==================== API 函数 ====================

/**
 * 创建部门
 * @param data 部门数据
 */
export async function createDepartmentApi(data: DepartmentApi.CreateDepartmentParams) {
  return requestClient.post<DepartmentApi.Department>('/department', data);
}

/**
 * 查询所有部门（扁平列表）
 * @param params 查询参数
 */
export async function getDepartmentListApi(params?: DepartmentApi.QueryDepartmentParams) {
  return requestClient.get<DepartmentApi.Department[]>('/department', { params });
}

/**
 * 查询部门树
 */
export async function getDepartmentTreeApi() {
  return requestClient.get<DepartmentApi.Department[]>('/department/tree');
}

/**
 * 查询部门详情
 * @param id 部门ID
 */
export async function getDepartmentApi(id: number) {
  return requestClient.get<DepartmentApi.Department>(`/department/${id}`);
}

/**
 * 更新部门信息
 * @param id 部门ID
 * @param data 更新数据
 */
export async function updateDepartmentApi(
  id: number,
  data: DepartmentApi.UpdateDepartmentParams,
) {
  return requestClient.patch<DepartmentApi.Department>(`/department/${id}`, data);
}

/**
 * 删除部门
 * @param id 部门ID
 */
export async function deleteDepartmentApi(id: number) {
  return requestClient.delete<boolean>(`/department/${id}`);
}
