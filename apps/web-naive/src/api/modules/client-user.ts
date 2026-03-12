import { requestClient } from '#/api/request';

export namespace ClientUserApi {
  export interface ClientUser {
    id: number;
    username: string;
    nickName: string;
    avatar: string;
    phone: string;
    email: string;
    gender: number;
    moduleCode: string;
    enabled: boolean;
    remark: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface CreateParams {
    username: string;
    password: string;
    nickName?: string;
    avatar?: string;
    phone?: string;
    email?: string;
    gender?: number;
    moduleCode?: string;
    enabled?: boolean;
    remark?: string;
  }

  export interface UpdateParams extends Partial<CreateParams> {}

  export interface QueryParams {
    page?: number;
    pageSize?: number;
    keyword?: string;
    enabled?: number;
    moduleCode?: string;
  }

  export interface PageResult {
    pageData: ClientUser[];
    total: number;
  }
}

export async function getClientUserListApi(params: ClientUserApi.QueryParams) {
  return requestClient.get<ClientUserApi.PageResult>('/client/user', { params });
}

export async function getClientUserApi(id: number) {
  return requestClient.get<ClientUserApi.ClientUser>(`/client/user/${id}`);
}

export async function createClientUserApi(data: ClientUserApi.CreateParams) {
  return requestClient.post<ClientUserApi.ClientUser>('/client/user', data);
}

export async function updateClientUserApi(
  id: number,
  data: ClientUserApi.UpdateParams,
) {
  return requestClient.patch<ClientUserApi.ClientUser>(
    `/client/user/${id}`,
    data,
  );
}

export async function deleteClientUserApi(id: number) {
  return requestClient.delete<boolean>(`/client/user/${id}`);
}

export async function toggleClientUserApi(id: number) {
  return requestClient.patch<boolean>(`/client/user/${id}/toggle`);
}

export async function resetClientUserPasswordApi(
  id: number,
  password: string,
) {
  return requestClient.patch<boolean>(`/client/user/${id}/reset-password`, {
    password,
  });
}
