import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================
export namespace UserGroupApi {
  /** 用户组 */
  export interface UserGroup {
    id: number;
    code: string;
    name: string;
    description: string;
    enable: boolean;
    sort: number;
    createTime: string;
    updateTime: string;
    members?: UserMember[];
  }

  /** 用户组成员 */
  export interface UserMember {
    id: number;
    username: string;
    enabled: boolean;
  }

  /** 创建用户组参数 */
  export interface CreateParams {
    code: string;
    name: string;
    description?: string;
    enable?: boolean;
    sort?: number;
  }

  /** 更新用户组参数 */
  export interface UpdateParams {
    code?: string;
    name?: string;
    description?: string;
    enable?: boolean;
    sort?: number;
  }

  /** 查询参数 */
  export interface QueryParams {
    pageNo?: number;
    pageSize?: number;
    keyword?: string;
  }

  /** 分页响应 */
  export interface PageResult {
    pageData: UserGroup[];
    total: number;
  }

  /** 添加成员参数 */
  export interface AddMembersParams {
    userIds: number[];
  }
}

// ==================== API 函数 ====================

/**
 * 创建用户组
 * @param data 创建数据
 */
export async function createUserGroupApi(data: UserGroupApi.CreateParams) {
  return requestClient.post<UserGroupApi.UserGroup>('/user-group', data);
}

/**
 * 查询用户组列表
 * @param params 查询参数
 */
export async function getUserGroupListApi(params: UserGroupApi.QueryParams) {
  return requestClient.get<UserGroupApi.PageResult>('/user-group', { params });
}

/**
 * 查询用户组详情
 * @param id 用户组ID
 */
export async function getUserGroupApi(id: number) {
  return requestClient.get<UserGroupApi.UserGroup>(`/user-group/${id}`);
}

/**
 * 更新用户组
 * @param id 用户组ID
 * @param data 更新数据
 */
export async function updateUserGroupApi(
  id: number,
  data: UserGroupApi.UpdateParams,
) {
  return requestClient.patch<UserGroupApi.UserGroup>(`/user-group/${id}`, data);
}

/**
 * 删除用户组
 * @param id 用户组ID
 */
export async function deleteUserGroupApi(id: number) {
  return requestClient.delete<boolean>(`/user-group/${id}`);
}

/**
 * 添加用户组成员
 * @param id 用户组ID
 * @param data 成员数据
 */
export async function addUserGroupMembersApi(
  id: number,
  data: UserGroupApi.AddMembersParams,
) {
  return requestClient.post<UserGroupApi.UserGroup>(
    `/user-group/${id}/members`,
    data,
  );
}

/**
 * 移除用户组成员
 * @param id 用户组ID
 * @param userId 用户ID
 */
export async function removeUserGroupMemberApi(id: number, userId: number) {
  return requestClient.delete<UserGroupApi.UserGroup>(
    `/user-group/${id}/members/${userId}`,
  );
}

/**
 * 设置用户组权限
 * @param id 用户组ID
 * @param permissionIds 权限ID列表
 */
export async function setUserGroupPermissionsApi(
  id: number,
  permissionIds: number[],
) {
  return requestClient.post<UserGroupApi.UserGroup>(
    `/user-group/${id}/permissions`,
    { permissionIds },
  );
}

/**
 * 获取用户组权限
 * @param id 用户组ID
 */
export async function getUserGroupPermissionsApi(id: number) {
  return requestClient.get<any[]>(`/user-group/${id}/permissions`);
}
