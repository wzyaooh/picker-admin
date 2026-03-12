<script lang="ts" setup>
import { ref, onMounted, computed, watch } from 'vue';
import { 
  NModal, 
  NSelect, 
  NButton, 
  NSpace, 
  NIcon, 
  NAlert, 
  NDescriptions,
  NDescriptionsItem,
  NTag,
  NInput,
  NDivider,
} from 'naive-ui';
import { IconifyIcon } from '@vben/icons';
import { message } from '#/adapter/naive';
import { useApiKeyStore } from '#/store';

interface Props {
  show: boolean;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const apiKeyStore = useApiKeyStore();
const tempSelectedId = ref<string>('');
const fullKeyInput = ref<string>('');
const showFullKeyInput = ref(false);

// 快速配置相关
const quickConfigName = ref<string>('');
const quickConfigKey = ref<string>('');

// 选项列表
const apiKeyOptions = computed(() => {
  return apiKeyStore.apiKeyList.map(key => ({
    label: `${key.name} (${key.keyPrefix}...)`,
    value: key.id,
    disabled: !key.enabled,
  }));
});

// 当前选择的API Key信息
const selectedKeyInfo = computed(() => {
  return apiKeyStore.apiKeyList.find(key => key.id === tempSelectedId.value) || null;
});

// 监听弹窗显示状态
watch(() => props.show, (newVal: boolean) => {
  if (newVal) {
    tempSelectedId.value = apiKeyStore.selectedApiKeyId;
    fullKeyInput.value = '';
    showFullKeyInput.value = false;
    quickConfigName.value = '';
    quickConfigKey.value = '';
    apiKeyStore.loadApiKeyList().catch(() => {
      message.error('加载 API Key 列表失败，请检查网络连接');
    });
  }
});

// 处理API Key选择变化
function handleApiKeyChange(value: string) {
  tempSelectedId.value = value;
  if (value) {
    showFullKeyInput.value = true;
  } else {
    showFullKeyInput.value = false;
    fullKeyInput.value = '';
  }
}

// 保存配置
function handleSave() {
  if (!tempSelectedId.value) {
    apiKeyStore.clearSelectedApiKey();
    message.success('已清除 API Key 配置');
    emit('update:show', false);
    return;
  }

  if (!fullKeyInput.value.trim()) {
    message.error('请输入完整的 API Key');
    return;
  }

  // 验证API Key格式
  if (!fullKeyInput.value.startsWith('ck_live_')) {
    message.error('API Key 格式不正确，应以 ck_live_ 开头');
    return;
  }

  apiKeyStore.selectApiKey(tempSelectedId.value, fullKeyInput.value.trim());
  message.success('API Key 配置已保存');
  emit('update:show', false);
}

// 刷新API Key列表
function handleRefresh() {
  apiKeyStore.loadApiKeyList().catch(() => {
    message.error('加载 API Key 列表失败，请检查网络连接或稍后重试');
  });
}

// 清除配置
function handleClear() {
  tempSelectedId.value = '';
  fullKeyInput.value = '';
  showFullKeyInput.value = false;
}

// 快速配置
function handleQuickConfig() {
  if (!quickConfigKey.value.trim()) {
    message.error('请输入完整的 API Key');
    return;
  }

  // 验证API Key格式
  if (!quickConfigKey.value.startsWith('ck_live_')) {
    message.error('API Key 格式不正确，应以 ck_live_ 开头');
    return;
  }

  // 直接配置（selectApiKey 方法已经能处理不在列表中的情况）
  apiKeyStore.selectApiKey('quick-config', quickConfigKey.value.trim());
  
  // 创建临时的 API Key 信息并添加到列表中
  const tempApiKey = {
    id: 'quick-config',
    name: quickConfigName.value || '快速配置的 API Key',
    keyPrefix: quickConfigKey.value.substring(0, 16) + '...',
    permissions: ['crawler:*'],
    enabled: true,
  };
  
  // 添加到列表中（如果不存在的话）
  if (!apiKeyStore.apiKeyList.find(key => key.id === 'quick-config')) {
    apiKeyStore.apiKeyList.push(tempApiKey);
  }
  
  message.success('API Key 快速配置成功');
  emit('update:show', false);
}

onMounted(() => {
  if (props.show) {
    apiKeyStore.loadApiKeyList().catch(() => {
      message.error('加载 API Key 列表失败，请检查网络连接');
    });
  }
});
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    title="全局 API Key 配置"
    style="width: 600px"
    @close="emit('update:show', false)"
  >
    <div class="space-y-4">
      <!-- 当前配置状态 -->
      <NAlert
        v-if="apiKeyStore.hasSelectedApiKey"
        :type="apiKeyStore.apiKeyStatus.type as any"
        :title="`当前配置: ${apiKeyStore.selectedApiKeyInfo?.name}`"
      >
        状态: {{ apiKeyStore.apiKeyStatus.text }} | 
        权限: {{ apiKeyStore.selectedApiKeyInfo?.permissions.length }} 项 |
        前缀: {{ apiKeyStore.selectedApiKeyInfo?.keyPrefix }}...
      </NAlert>
      
      <NAlert
        v-else
        type="info"
        title="未配置 API Key"
      >
        请选择并配置一个 API Key 以访问爬虫服务
      </NAlert>

      <!-- API Key 选择 -->
      <div>
        <div class="mb-2 font-medium">选择 API Key</div>
        <div class="flex items-center gap-2">
          <NSelect
            v-model:value="tempSelectedId"
            :options="apiKeyOptions"
            :loading="apiKeyStore.loading"
            placeholder="请选择 API Key"
            clearable
            filterable
            class="flex-1"
            @update:value="handleApiKeyChange"
          />
          
          <NButton
            size="small"
            :loading="apiKeyStore.loading"
            @click="handleRefresh"
          >
            <template #icon>
              <NIcon><IconifyIcon icon="lucide:refresh-cw" /></NIcon>
            </template>
          </NButton>
        </div>
      </div>

      <!-- 选中的API Key信息 -->
      <div v-if="selectedKeyInfo">
        <NDivider />
        <div class="mb-2 font-medium">API Key 信息</div>
        <NDescriptions :column="2" size="small">
          <NDescriptionsItem label="名称">
            {{ selectedKeyInfo.name }}
          </NDescriptionsItem>
          <NDescriptionsItem label="状态">
            <NTag :type="selectedKeyInfo.enabled ? 'success' : 'default'">
              {{ selectedKeyInfo.enabled ? '启用' : '禁用' }}
            </NTag>
          </NDescriptionsItem>
          <NDescriptionsItem label="权限数量">
            {{ selectedKeyInfo.permissions.length }} 项
          </NDescriptionsItem>
          <NDescriptionsItem label="过期时间">
            {{ selectedKeyInfo.expiresAt ? new Date(selectedKeyInfo.expiresAt).toLocaleString() : '永不过期' }}
          </NDescriptionsItem>
        </NDescriptions>
        
        <div class="mt-2">
          <div class="text-sm text-gray-600 mb-1">权限列表:</div>
          <NSpace size="small">
            <NTag
              v-for="permission in selectedKeyInfo.permissions"
              :key="permission"
              size="small"
              type="info"
            >
              {{ permission }}
            </NTag>
          </NSpace>
        </div>
      </div>

      <!-- 完整API Key输入 -->
      <div v-if="showFullKeyInput">
        <NDivider />
        <div class="mb-2 font-medium">输入完整 API Key</div>
        
        <!-- 获取完整密钥的提示 -->
        <NAlert type="warning" :show-icon="false" class="mb-3">
          <div class="text-sm">
            <div class="font-medium mb-1">如何获取完整 API Key？</div>
            <ul class="list-disc list-inside space-y-1 text-xs">
              <li><strong>新建时：</strong>在 API Key 管理页面创建新密钥时会显示完整密钥</li>
              <li><strong>重新生成：</strong>在 API Key 管理页面点击"重新生成"按钮获取新密钥</li>
              <li><strong>注意：</strong>完整密钥只在创建/重新生成时显示一次，请及时保存</li>
            </ul>
          </div>
        </NAlert>
        
        <NInput
          v-model:value="fullKeyInput"
          type="textarea"
          :rows="3"
          placeholder="请输入完整的 API Key (ck_live_...)"
          style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 12px;"
        />
        <div class="mt-1 text-xs text-gray-500">
          请从 API Key 管理页面复制完整的密钥。出于安全考虑，系统不会显示完整密钥。
        </div>
      </div>

      <!-- 快速配置选项 -->
      <div v-if="apiKeyStore.apiKeyList.length === 0 && !apiKeyStore.loading">
        <NDivider />
        <div class="mb-2 font-medium">快速配置（测试用）</div>
        <NAlert type="info" :show-icon="false" class="mb-3">
          <div class="text-sm">
            <div class="font-medium mb-1">无法加载 API Key 列表？</div>
            <div class="text-xs">
              如果你有现成的 API Key，可以直接在下方输入进行快速配置。
            </div>
          </div>
        </NAlert>
        
        <div class="space-y-3">
          <NInput
            v-model:value="quickConfigName"
            placeholder="API Key 名称（可选）"
            size="small"
          />
          <NInput
            v-model:value="quickConfigKey"
            type="textarea"
            :rows="2"
            placeholder="请输入完整的 API Key (ck_live_...)"
            style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 12px;"
          />
          <div class="flex justify-end">
            <NButton
              type="primary"
              size="small"
              :disabled="!quickConfigKey.trim()"
              @click="handleQuickConfig"
            >
              快速配置
            </NButton>
          </div>
        </div>
      </div>
      <NAlert type="info" :show-icon="false">
        <div class="text-sm">
          <div class="font-medium mb-1">使用说明:</div>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>配置后将在所有爬虫相关页面中自动使用此 API Key</li>
            <li>API Key 会保存在浏览器本地存储中</li>
            <li>如需更换 API Key，请重新配置</li>
            <li>建议定期检查 API Key 的有效性和权限</li>
          </ul>
        </div>
      </NAlert>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <NButton @click="handleClear">
          清除选择
        </NButton>
        
        <NSpace>
          <NButton @click="emit('update:show', false)">
            取消
          </NButton>
          <NButton type="primary" @click="handleSave">
            保存配置
          </NButton>
        </NSpace>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>
