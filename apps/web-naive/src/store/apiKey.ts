import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getApiKeyListApi } from '#/api/modules/api-key';

export interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  enabled: boolean;
  expiresAt?: string;
  fullKey?: string; // 完整的API Key（仅在选择时临时存储）
}

export const useApiKeyStore = defineStore('apiKey', () => {
  // 状态
  const selectedApiKeyId = ref<string>('');
  const selectedApiKeyInfo = ref<ApiKeyInfo | null>(null);
  const apiKeyList = ref<ApiKeyInfo[]>([]);
  const loading = ref(false);

  // 计算属性
  const hasSelectedApiKey = computed(() => !!selectedApiKeyId.value);
  
  const isApiKeyValid = computed(() => {
    if (!selectedApiKeyInfo.value) return false;
    if (!selectedApiKeyInfo.value.enabled) return false;
    if (selectedApiKeyInfo.value.expiresAt) {
      return new Date(selectedApiKeyInfo.value.expiresAt) > new Date();
    }
    return true;
  });

  const apiKeyStatus = computed(() => {
    if (!selectedApiKeyInfo.value) return { type: 'default', text: '未选择' };
    if (!selectedApiKeyInfo.value.enabled) return { type: 'warning', text: '已禁用' };
    if (selectedApiKeyInfo.value.expiresAt && new Date(selectedApiKeyInfo.value.expiresAt) <= new Date()) {
      return { type: 'error', text: '已过期' };
    }
    return { type: 'success', text: '可用' };
  });

  // 方法
  async function loadApiKeyList() {
    try {
      loading.value = true;
      const result = await getApiKeyListApi({ 
        pageNo: 1, 
        pageSize: 100
      } as any); // 临时绕过类型检查，因为我们需要添加防缓存参数
      
      apiKeyList.value = result.pageData.map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        permissions: key.permissions,
        enabled: key.enabled,
        expiresAt: key.expiresAt,
      }));

      // 如果当前选择的API Key不在列表中，清除选择
      if (selectedApiKeyId.value && !apiKeyList.value.find(key => key.id === selectedApiKeyId.value)) {
        clearSelectedApiKey();
      }
    } catch (error) {
      console.error('Failed to load API key list:', error);
      // 不要抛出错误，而是显示友好提示
      apiKeyList.value = [];
    } finally {
      loading.value = false;
    }
  }

  function selectApiKey(apiKeyId: string, fullKey?: string) {
    const apiKey = apiKeyList.value.find(key => key.id === apiKeyId);
    if (apiKey) {
      selectedApiKeyId.value = apiKeyId;
      selectedApiKeyInfo.value = {
        ...apiKey,
        fullKey: fullKey || undefined,
      };
    } else if (fullKey) {
      // 如果在列表中找不到，但提供了 fullKey，创建临时的 API Key 信息
      selectedApiKeyId.value = apiKeyId;
      selectedApiKeyInfo.value = {
        id: apiKeyId,
        name: apiKeyId === 'quick-config' ? '快速配置的 API Key' : 'API Key',
        keyPrefix: fullKey.substring(0, 16) + '...',
        permissions: ['crawler:*'],
        enabled: true,
        fullKey: fullKey,
      };
    }
    
    // 保存到localStorage
    localStorage.setItem('selectedApiKeyId', apiKeyId);
    if (fullKey) {
      // 注意：这里存储完整API Key有安全风险，实际项目中可能需要更安全的方式
      localStorage.setItem('selectedApiKeyFull', fullKey);
    }
  }

  function clearSelectedApiKey() {
    selectedApiKeyId.value = '';
    selectedApiKeyInfo.value = null;
    localStorage.removeItem('selectedApiKeyId');
    localStorage.removeItem('selectedApiKeyFull');
  }

  function restoreFromStorage() {
    const savedId = localStorage.getItem('selectedApiKeyId');
    const savedFullKey = localStorage.getItem('selectedApiKeyFull');
    
    if (savedId && savedFullKey) {
      // 直接使用保存的信息恢复，不依赖 API Key 列表
      selectApiKey(savedId, savedFullKey);
      
      // 异步加载 API Key 列表，但不影响当前配置
      loadApiKeyList().catch(() => {
        console.warn('Failed to load API key list, but using cached configuration');
      });
    } else if (savedId) {
      // 只有 ID 没有完整密钥，需要加载列表
      loadApiKeyList().then(() => {
        selectApiKey(savedId);
      }).catch(() => {
        console.warn('Failed to load API key list and no cached full key');
      });
    }
  }

  // 获取用于HTTP请求的API Key
  function getApiKeyForRequest(): string | null {
    return selectedApiKeyInfo.value?.fullKey || null;
  }

  // 检查是否有特定权限
  function hasPermission(permission: string): boolean {
    if (!selectedApiKeyInfo.value) return false;
    return selectedApiKeyInfo.value.permissions.includes(permission) || 
           selectedApiKeyInfo.value.permissions.includes('crawler:*');
  }

  return {
    // 状态
    selectedApiKeyId,
    selectedApiKeyInfo,
    apiKeyList,
    loading,
    
    // 计算属性
    hasSelectedApiKey,
    isApiKeyValid,
    apiKeyStatus,
    
    // 方法
    loadApiKeyList,
    selectApiKey,
    clearSelectedApiKey,
    restoreFromStorage,
    getApiKeyForRequest,
    hasPermission,
  };
});
