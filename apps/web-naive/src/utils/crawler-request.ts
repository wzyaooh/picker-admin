/**
 * 爬虫服务专用的HTTP请求工具
 * 自动添加API Key认证头
 */

import { crawlerRequestClient } from '#/api/request';
import { useApiKeyStore } from '#/store';
import { message } from '#/adapter/naive';

// 爬虫服务的基础URL
const CRAWLER_BASE_URL = '/crawler-api';

/**
 * 创建带API Key认证的请求实例
 */
export function createCrawlerRequest() {
  // 请求拦截器 - 添加API Key
  const requestInterceptor = crawlerRequestClient.addRequestInterceptor({
    fulfilled: (config) => {
      // 只对爬虫相关的请求添加API Key
      if (config.url?.startsWith(CRAWLER_BASE_URL)) {
        try {
          const apiKeyStore = useApiKeyStore();
          const apiKey = apiKeyStore.getApiKeyForRequest();
          
          console.log('🔑 API Key Debug:', {
            hasApiKey: !!apiKey,
            selectedApiKeyId: apiKeyStore.selectedApiKeyId,
            hasSelectedApiKeyInfo: !!apiKeyStore.selectedApiKeyInfo,
            fullKeyLength: apiKey?.length || 0,
            isValid: apiKeyStore.isApiKeyValid,
          });
          
          if (!apiKey) {
            // 如果没有配置API Key，显示提示
            message.warning('请先配置 API Key 以访问爬虫服务');
            return Promise.reject(new Error('未配置 API Key'));
          }
          
          if (!apiKeyStore.isApiKeyValid) {
            message.error('API Key 无效或已过期，请重新配置');
            return Promise.reject(new Error('API Key 无效'));
          }
          
          // 添加API Key到请求头
          config.headers = config.headers || {};
          config.headers['X-API-Key'] = apiKey;
        } catch (error) {
          console.warn('Failed to get API key from store:', error);
          // 如果 store 还没有初始化，跳过 API Key 添加
          // 这样可以避免在应用启动时的错误
        }
      }
      
      return config;
    },
    rejected: (error) => {
      return Promise.reject(error);
    }
  });

  // 响应拦截器 - 处理认证错误
  const responseInterceptor = crawlerRequestClient.addResponseInterceptor({
    fulfilled: (response) => {
      return response;
    },
    rejected: (error) => {
      // 处理API Key相关的错误
      if (error.response?.status === 401 && error.config?.url?.startsWith(CRAWLER_BASE_URL)) {
        const errorMessage = error.response.data?.message || '认证失败';
        
        if (errorMessage.includes('API Key')) {
          message.error(`API Key 认证失败: ${errorMessage}`);
          // 可以选择清除无效的API Key配置
          // try {
          //   const apiKeyStore = useApiKeyStore();
          //   apiKeyStore.clearSelectedApiKey();
          // } catch (e) {
          //   console.warn('Failed to clear API key:', e);
          // }
        }
      } else if (error.response?.status === 403 && error.config?.url?.startsWith(CRAWLER_BASE_URL)) {
        message.error('权限不足，请检查 API Key 权限配置');
      } else if (error.response?.status === 429 && error.config?.url?.startsWith(CRAWLER_BASE_URL)) {
        message.error('请求过于频繁，请稍后再试');
      }
      
      return Promise.reject(error);
    }
  });

  return {
    requestInterceptor,
    responseInterceptor,
  };
}

/**
 * 爬虫服务专用的请求方法
 */
export const crawlerRequest = {
  get: <T = any>(url: string, config?: any) => {
    initializeCrawlerInterceptors();
    return crawlerRequestClient.get<T>(`${CRAWLER_BASE_URL}${url}`, config);
  },
  
  post: <T = any>(url: string, data?: any, config?: any) => {
    initializeCrawlerInterceptors();
    return crawlerRequestClient.post<T>(`${CRAWLER_BASE_URL}${url}`, data, config);
  },
  
  put: <T = any>(url: string, data?: any, config?: any) => {
    initializeCrawlerInterceptors();
    return crawlerRequestClient.put<T>(`${CRAWLER_BASE_URL}${url}`, data, config);
  },
  
  patch: <T = any>(url: string, data?: any, config?: any) => {
    initializeCrawlerInterceptors();
    return crawlerRequestClient.patch<T>(`${CRAWLER_BASE_URL}${url}`, data, config);
  },
  
  delete: <T = any>(url: string, config?: any) => {
    initializeCrawlerInterceptors();
    return crawlerRequestClient.delete<T>(`${CRAWLER_BASE_URL}${url}`, config);
  },
};

/**
 * 检查是否有特定权限
 */
export function checkCrawlerPermission(permission: string): boolean {
  const apiKeyStore = useApiKeyStore();
  return apiKeyStore.hasPermission(permission);
}

/**
 * 权限装饰器 - 用于组件方法
 */
export function requirePermission(permission: string) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      if (!checkCrawlerPermission(permission)) {
        message.error(`权限不足，需要权限: ${permission}`);
        return;
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// 延迟初始化拦截器，避免在模块加载时就执行
let interceptorsInitialized = false;

function initializeCrawlerInterceptors() {
  if (interceptorsInitialized) return;
  
  try {
    createCrawlerRequest();
    interceptorsInitialized = true;
  } catch (error) {
    console.warn('Failed to initialize crawler interceptors:', error);
  }
}
