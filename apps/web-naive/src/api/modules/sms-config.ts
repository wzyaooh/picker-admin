import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

export namespace SmsConfigApi {
  export interface SmsConfig {
    id: number;
    name: string;
    provider: string;
    isDefault: boolean;
    accessKey: string;
    secretKey: string;
    signName: string;
    templateId: string;
    enabled: boolean;
    loadBalanceConfig: string | null;
    retryInterval: number;
    remark: string | null;
    createdAt: string;
    updatedAt: string;
  }

  export interface CreateParams {
    name: string;
    provider: string;
    accessKey: string;
    secretKey: string;
    signName: string;
    templateId: string;
    isDefault?: boolean;
    enabled?: boolean;
    loadBalanceConfig?: string;
    retryInterval?: number;
    remark?: string;
  }

  export interface UpdateParams extends Partial<CreateParams> {}

  export interface QueryParams {
    keyword?: string;
    provider?: string;
    enabled?: boolean;
    page?: number;
    pageSize?: number;
  }

  export interface PageResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
  }
}

// ==================== API 函数 ====================

export async function getSmsConfigListApi(params?: SmsConfigApi.QueryParams) {
  return requestClient.get<SmsConfigApi.PageResult<SmsConfigApi.SmsConfig>>(
    '/sms-config',
    { params },
  );
}

export async function createSmsConfigApi(data: SmsConfigApi.CreateParams) {
  return requestClient.post<SmsConfigApi.SmsConfig>('/sms-config', data);
}

export async function updateSmsConfigApi(id: number, data: SmsConfigApi.UpdateParams) {
  return requestClient.patch<SmsConfigApi.SmsConfig>(`/sms-config/${id}`, data);
}

export async function deleteSmsConfigApi(id: number) {
  return requestClient.delete<boolean>(`/sms-config/${id}`);
}

export async function toggleSmsConfigApi(id: number) {
  return requestClient.patch<SmsConfigApi.SmsConfig>(`/sms-config/${id}/toggle`);
}

export async function setDefaultSmsConfigApi(id: number) {
  return requestClient.patch<SmsConfigApi.SmsConfig>(`/sms-config/${id}/set-default`);
}
