/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from '#/adapter/naive';
import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi();
    const newToken = resp.data;
    accessStore.setAccessToken(newToken);
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  // 处理返回的响应数据格式
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );

  // token过期的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // 这里可以根据业务进行定制,你可以拿到 error 内的信息进行定制化处理，根据不同的 code 做不同的提示，而不是直接使用 message.error 提示 msg
      const responseData = error?.response?.data ?? {};
      
      // 优先使用 message 字段（实际错误消息），而不是 error 字段（异常类名）
      let errorMessage = responseData?.message ?? responseData?.error ?? msg ?? '操作失败';
      
      // 如果错误消息是数组，转换为字符串
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.join('; ');
      } else {
        errorMessage = String(errorMessage);
      }
      
      // 友好化常见的错误消息
      const friendlyMessage = makeFriendlyErrorMessage(errorMessage);
      
      message.error(friendlyMessage);
    }),
  );

  return client;
}

/**
 * 将技术性错误消息转换为用户友好的消息
 */
function makeFriendlyErrorMessage(errorMessage: string): string {
  // 字段验证错误映射
  const fieldNameMap: Record<string, string> = {
    'enable': '启用状态',
    'code': '编码',
    'name': '名称',
    'label': '标签',
    'value': '值',
    'description': '描述',
    'sort': '排序',
    'username': '用户名',
    'password': '密码',
    'email': '邮箱',
  };
  
  // 错误类型映射
  const errorTypeMap: Record<string, string> = {
    'must be a boolean value': '必须是开关类型（是/否）',
    'must be a string': '必须是文本',
    'must be a number': '必须是数字',
    'must be an integer': '必须是整数',
    'should not be empty': '不能为空',
    'must be longer than': '长度不足',
    'must be shorter than': '长度超出限制',
    'must match': '格式不正确',
    'already exists': '已存在',
    'not found': '不存在',
    'is required': '为必填项',
  };
  
  let friendlyMessage = errorMessage;
  
  // 替换字段名
  Object.entries(fieldNameMap).forEach(([key, value]) => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    friendlyMessage = friendlyMessage.replace(regex, value);
  });
  
  // 替换错误类型
  Object.entries(errorTypeMap).forEach(([key, value]) => {
    if (friendlyMessage.toLowerCase().includes(key.toLowerCase())) {
      friendlyMessage = friendlyMessage.replace(new RegExp(key, 'gi'), value);
    }
  });
  
  // 特殊处理：BadRequestException
  if (friendlyMessage.includes('BadRequestException')) {
    friendlyMessage = friendlyMessage.replace(/BadRequestException/gi, '请求参数错误');
  }
  
  return friendlyMessage;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });

export const crawlerRequestClient = createRequestClient('', {
  responseReturn: 'data',
});

