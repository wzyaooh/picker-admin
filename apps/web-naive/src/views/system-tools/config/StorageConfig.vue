<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import {
  NTabs,
  NTabPane,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSwitch,
  NButton,
  NTag,
  NModal,
  NSpin,
} from 'naive-ui';
import { message, dialog } from '#/adapter/naive';
import {
  getStorageConfigListApi,
  createStorageConfigApi,
  updateStorageConfigApi,
  deleteStorageConfigApi,
  toggleStorageConfigApi,
  setDefaultStorageConfigApi,
  type StorageConfigApi,
} from '#/api';

defineOptions({ name: 'StorageConfig' });

const activeTab = ref('all');
const keyword = ref('');
const loading = ref(false);
const storageList = ref<StorageConfigApi.StorageConfig[]>([]);

// 弹窗状态
const showModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const editingId = ref<number | null>(null);
const modalType = ref<'local' | 'object'>('local');

// 表单数据
const formData = ref<StorageConfigApi.CreateStorageConfigParams>({
  name: '',
  type: 'local',
  description: '',
  enabled: true,
  isDefault: false,
});

// 过滤后的存储列表
const filteredStorages = computed(() => {
  let list = storageList.value;

  // 按标签页过滤
  if (activeTab.value === 'local') {
    list = list.filter(s => s.type === 'local');
  } else if (activeTab.value === 'object') {
    list = list.filter(s => s.type === 'object');
  }

  // 按关键词搜索
  if (keyword.value) {
    list = list.filter(s => 
      s.name.includes(keyword.value) || 
      (s.description && s.description.includes(keyword.value))
    );
  }

  return list;
});

// 本地存储列表
const localStorages = computed(() => 
  filteredStorages.value.filter(s => s.type === 'local')
);

// 对象存储列表
const objectStorages = computed(() => 
  filteredStorages.value.filter(s => s.type === 'object')
);

// 获取存储配置列表
async function fetchStorageList() {
  loading.value = true;
  try {
    const result = await getStorageConfigListApi({
      page: 1,
      pageSize: 100,
    });
    storageList.value = result.items;
  } catch (error) {
    // 错误已被拦截器处理
  } finally {
    loading.value = false;
  }
}

// 打开新建弹窗
function openCreateModal(type: 'local' | 'object') {
  modalMode.value = 'create';
  modalType.value = type;
  editingId.value = null;
  
  if (type === 'local') {
    formData.value = {
      name: '',
      type: 'local',
      description: '',
      code: '',
      storagePath: '',
      accessPath: '',
      enableRecycleBin: false,
      recycleBinPath: '',
      sort: 999,
      enabled: true,
      isDefault: false,
    };
  } else {
    formData.value = {
      name: '',
      type: 'object',
      description: '',
      enabled: true,
      isDefault: false,
    };
  }
  
  showModal.value = true;
}

// 打开编辑弹窗
function openEditModal(storage: StorageConfigApi.StorageConfig) {
  modalMode.value = 'edit';
  modalType.value = storage.type;
  editingId.value = storage.id;
  
  formData.value = {
    name: storage.name,
    type: storage.type,
    description: storage.description || '',
    enabled: storage.enabled,
    isDefault: storage.isDefault,
  };

  // 如果是本地存储，填充本地存储配置
  if (storage.type === 'local') {
    formData.value.code = storage.code || '';
    formData.value.storagePath = storage.storagePath || '';
    formData.value.accessPath = storage.accessPath || '';
    formData.value.enableRecycleBin = storage.enableRecycleBin || false;
    formData.value.recycleBinPath = storage.recycleBinPath || '';
    formData.value.sort = storage.sort !== undefined ? storage.sort : 999;
  }

  // 如果是对象存储，填充对象存储配置
  if (storage.type === 'object' && storage.objectConfig) {
    formData.value.endpoint = storage.objectConfig.endpoint;
    formData.value.accessKeyId = storage.objectConfig.accessKeyId;
    formData.value.secretAccessKey = '';
    formData.value.bucket = storage.objectConfig.bucket;
    formData.value.region = storage.objectConfig.region;
    formData.value.useSSL = storage.objectConfig.useSSL;
  }

  showModal.value = true;
}

// 保存存储配置
async function saveStorage() {
  // 验证必填项
  if (!formData.value.name) {
    message.warning('请输入存储名称');
    return;
  }

  if (formData.value.type === 'local') {
    if (!formData.value.code) {
      message.warning('请输入存储编码');
      return;
    }
    if (!formData.value.storagePath) {
      message.warning('请输入存储路径');
      return;
    }
    if (!formData.value.accessPath) {
      message.warning('请输入访问路径');
      return;
    }
  }

  if (formData.value.type === 'object') {
    if (!formData.value.endpoint || !formData.value.accessKeyId || !formData.value.bucket) {
      message.warning('请填写对象存储的必填项');
      return;
    }
  }

  try {
    if (modalMode.value === 'create') {
      await createStorageConfigApi(formData.value);
      message.success('创建成功');
    } else if (editingId.value) {
      await updateStorageConfigApi(editingId.value, formData.value);
      message.success('更新成功');
    }

    showModal.value = false;
    await fetchStorageList();
  } catch (error) {
    // 错误已被拦截器处理
  }
}

// 切换存储状态
async function toggleStorage(storage: StorageConfigApi.StorageConfig) {
  try {
    await toggleStorageConfigApi(storage.id);
    message.success(storage.enabled ? '已禁用' : '已启用');
    await fetchStorageList();
  } catch (error) {
    // 错误已被拦截器处理
  }
}

// 设置为默认存储
async function setDefaultStorage(storage: StorageConfigApi.StorageConfig) {
  if (storage.isDefault) {
    message.info('已经是默认存储');
    return;
  }

  try {
    await setDefaultStorageConfigApi(storage.id);
    message.success('已设置为默认存储');
    await fetchStorageList();
  } catch (error) {
    // 错误已被拦截器处理
  }
}

// 删除存储（保留函数，虽然当前未使用，但可能在未来需要）
function deleteStorage(storage: StorageConfigApi.StorageConfig, event: Event) {
  event.stopPropagation();

  if (storage.isDefault) {
    message.warning('不能删除默认存储配置');
    return;
  }

  dialog.warning({
    title: '确认删除',
    content: `确定要删除存储配置「${storage.name}」吗？此操作不可恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteStorageConfigApi(storage.id);
        message.success('删除成功');
        await fetchStorageList();
      } catch (error) {
        // 错误已被拦截器处理
      }
    },
  });
}

// 组件挂载时获取数据
onMounted(() => {
  fetchStorageList();
});
</script>

<template>
  <div>
    <!-- 顶部标签页 -->
    <div class="mb-4">
      <NTabs v-model:value="activeTab" type="line" animated>
        <NTabPane name="all" tab="全部" />
        <NTabPane name="local" tab="本地存储" />
        <NTabPane name="object" tab="对象存储" />
      </NTabs>
    </div>

    <NSpin :show="loading">
      <!-- 本地存储区域 -->
      <div v-if="activeTab === 'all' || activeTab === 'local'" class="mb-8">
        <div class="mb-4 border-l-4 border-blue-500 pl-3 text-base font-semibold">
          本地存储
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <!-- 创建卡片 -->
          <div
            class="flex min-h-[200px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-600 bg-gray-800 transition-colors hover:border-blue-400 hover:bg-gray-700"
            @click="openCreateModal('local')"
          >
            <div class="text-center">
              <i class="lucide:plus mb-2 text-4xl text-gray-400" />
              <div class="text-sm text-gray-400">点击创建本地存储</div>
            </div>
          </div>

          <!-- 暂无配置提示（当列表为空时显示在创建卡片右侧） -->
          <div v-if="localStorages.length === 0" class="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-600 bg-gray-800/50">
            <div class="text-center px-6">
              <i class="lucide:database mb-3 text-5xl text-gray-500" />
              <div class="mb-2 text-lg font-semibold text-gray-200">暂无本地存储配置</div>
              <div class="text-sm leading-relaxed text-gray-400">
                点击左侧 <span class="text-blue-400">"+"</span> 按钮<br />创建第一个本地存储配置
              </div>
            </div>
          </div>

          <!-- 存储卡片 -->
          <div
            v-for="storage in localStorages"
            :key="storage.id"
            class="relative cursor-pointer rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-sm transition-shadow hover:shadow-md"
            @click="openEditModal(storage)"
          >
            <!-- 标题行 -->
            <div class="mb-3 flex items-start justify-between">
              <div class="flex-1">
                <div class="font-semibold text-white">{{ storage.name }}</div>
              </div>
              <div v-if="storage.isDefault">
                <NTag type="info" size="small" :bordered="false">
                  默认存储
                </NTag>
              </div>
            </div>

            <!-- 信息列表 -->
            <div class="space-y-2 text-sm">
              <div v-if="storage.storagePath" class="flex items-start">
                <span class="w-24 flex-shrink-0 text-gray-400">存储路径</span>
                <span class="flex-1 truncate text-gray-300" :title="storage.storagePath">{{ storage.storagePath }}</span>
              </div>
              <div v-if="storage.accessPath" class="flex items-start">
                <span class="w-24 flex-shrink-0 text-gray-400">访问路径</span>
                <span class="flex-1 truncate text-gray-300" :title="storage.accessPath">{{ storage.accessPath }}</span>
              </div>
              <div class="flex items-center">
                <span class="w-24 flex-shrink-0 text-gray-400">启用回收站</span>
                <span class="text-gray-300">{{ storage.enableRecycleBin ? '启用' : '禁用' }}</span>
              </div>
              <div v-if="storage.enableRecycleBin && storage.recycleBinPath" class="flex items-start">
                <span class="w-24 flex-shrink-0 text-gray-400">回收站路径</span>
                <span class="flex-1 text-gray-300">{{ storage.recycleBinPath }}</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="absolute bottom-4 right-4 flex items-center gap-2" @click.stop>
              <NButton
                v-if="!storage.isDefault"
                size="tiny"
                type="error"
                @click="deleteStorage(storage, $event)"
              >
                删除
              </NButton>
              <NButton
                v-if="!storage.isDefault"
                size="tiny"
                @click="setDefaultStorage(storage)"
              >
                设为默认
              </NButton>
              <NSwitch
                :value="storage.enabled"
                @update:value="() => toggleStorage(storage)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 对象存储区域 -->
      <div v-if="activeTab === 'all' || activeTab === 'object'">
        <div class="mb-4 border-l-4 border-blue-500 pl-3 text-base font-semibold">
          对象存储
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <!-- 创建卡片 -->
          <div
            class="flex min-h-[200px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-600 bg-gray-800 transition-colors hover:border-blue-400 hover:bg-gray-700"
            @click="openCreateModal('object')"
          >
            <div class="text-center">
              <i class="lucide:plus mb-2 text-4xl text-gray-400" />
              <div class="text-sm text-gray-400">点击创建对象存储</div>
            </div>
          </div>

          <!-- 暂无配置提示（当列表为空时显示在创建卡片右侧） -->
          <div v-if="objectStorages.length === 0" class="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-600 bg-gray-800/50">
            <div class="text-center px-6">
              <i class="lucide:cloud mb-3 text-5xl text-gray-500" />
              <div class="mb-2 text-lg font-semibold text-gray-200">暂无对象存储配置</div>
              <div class="text-sm leading-relaxed text-gray-400">
                点击左侧 <span class="text-blue-400">"+"</span> 按钮<br />创建第一个对象存储配置
              </div>
            </div>
          </div>

          <!-- 存储卡片 -->
          <div
            v-for="storage in objectStorages"
            :key="storage.id"
            class="relative cursor-pointer rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-sm transition-shadow hover:shadow-md"
            @click="openEditModal(storage)"
          >
            <!-- 标题行 -->
            <div class="mb-3 flex items-start justify-between">
              <div class="flex-1">
                <div class="font-semibold text-white">{{ storage.name }}</div>
              </div>
              <div v-if="storage.isDefault">
                <NTag type="info" size="small" :bordered="false">
                  默认存储
                </NTag>
              </div>
            </div>

            <!-- 信息列表 -->
            <div class="space-y-2 text-sm">
              <div v-if="storage.objectConfig" class="flex items-start">
                <span class="w-24 flex-shrink-0 text-gray-400">Endpoint</span>
                <span class="flex-1 truncate text-gray-300" :title="storage.objectConfig.endpoint">{{ storage.objectConfig.endpoint }}</span>
              </div>
              <div v-if="storage.objectConfig" class="flex items-center">
                <span class="w-24 flex-shrink-0 text-gray-400">Access Key</span>
                <span class="flex-1 truncate text-gray-300">{{ storage.objectConfig.accessKeyId }}</span>
              </div>
              <div v-if="storage.objectConfig" class="flex items-center">
                <span class="w-24 flex-shrink-0 text-gray-400">Bucket</span>
                <span class="text-gray-300">{{ storage.objectConfig.bucket }}</span>
              </div>
              <div v-if="storage.objectConfig && storage.objectConfig.region" class="flex items-center">
                <span class="w-24 flex-shrink-0 text-gray-400">Region</span>
                <span class="text-gray-300">{{ storage.objectConfig.region }}</span>
              </div>
              <div v-if="storage.objectConfig" class="flex items-center">
                <span class="w-24 flex-shrink-0 text-gray-400">使用 SSL</span>
                <span class="text-gray-300">{{ storage.objectConfig.useSSL ? '是' : '否' }}</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="absolute bottom-4 right-4 flex items-center gap-2" @click.stop>
              <NButton
                v-if="!storage.isDefault"
                size="tiny"
                type="error"
                @click="deleteStorage(storage, $event)"
              >
                删除
              </NButton>
              <NButton
                v-if="!storage.isDefault"
                size="tiny"
                @click="setDefaultStorage(storage)"
              >
                设为默认
              </NButton>
              <NSwitch
                :value="storage.enabled"
                @update:value="() => toggleStorage(storage)"
              />
            </div>
          </div>
        </div>
      </div>
    </NSpin>

    <!-- 存储配置弹窗 -->
    <NModal
      v-model:show="showModal"
      preset="dialog"
      :title="modalMode === 'create' ? `新建${modalType === 'local' ? '本地' : '对象'}存储` : `编辑${modalType === 'local' ? '本地' : '对象'}存储`"
      :positive-text="modalMode === 'create' ? '创建' : '更新'"
      negative-text="取消"
      style="width: 600px"
      @positive-click="saveStorage"
    >
      <NForm :model="formData" label-placement="left" label-width="120">
        <NFormItem label="存储名称" required>
          <NInput v-model:value="formData.name" placeholder="例如：开发环境" />
        </NFormItem>

        <NFormItem label="编码" :required="modalType === 'local'">
          <NInput v-model:value="formData.code" placeholder="例如：local_dev" />
        </NFormItem>
        
        <NFormItem label="描述">
          <NInput v-model:value="formData.description" type="textarea" placeholder="存储配置描述" :rows="2" />
        </NFormItem>

        <!-- 本地存储专用字段 -->
        <template v-if="modalType === 'local'">
          <NFormItem label="存储路径" required>
            <NInput v-model:value="formData.storagePath" placeholder="例如：./uploads" />
          </NFormItem>
          
          <NFormItem label="访问路径" required>
            <NInput v-model:value="formData.accessPath" placeholder="例如：http://localhost:8085/uploads/" />
          </NFormItem>

          <NFormItem label="启用回收站">
            <NSwitch v-model:value="formData.enableRecycleBin" />
          </NFormItem>

          <NFormItem v-if="formData.enableRecycleBin" label="回收站路径">
            <NInput v-model:value="formData.recycleBinPath" placeholder="例如：.RECYCLE.BIN/" />
          </NFormItem>

          <NFormItem label="排序">
            <NInputNumber v-model:value="formData.sort" placeholder="数字越小越靠前，默认 999" :min="0" :max="9999" style="width: 100%" />
          </NFormItem>
        </template>

        <!-- 对象存储专用字段 -->
        <template v-if="modalType === 'object'">
          <NFormItem label="Endpoint" required>
            <NInput v-model:value="formData.endpoint" placeholder="http://localhost:9000" />
          </NFormItem>
          
          <NFormItem label="Access Key" required>
            <NInput v-model:value="formData.accessKeyId" placeholder="访问密钥" />
          </NFormItem>
          
          <NFormItem label="Secret Key">
            <NInput 
              v-model:value="formData.secretAccessKey" 
              type="password" 
              placeholder="密钥（编辑时留空表示不修改）" 
            />
          </NFormItem>
          
          <NFormItem label="Bucket" required>
            <NInput v-model:value="formData.bucket" placeholder="bucket名称" />
          </NFormItem>
          
          <NFormItem label="Region">
            <NInput v-model:value="formData.region" placeholder="区域（可选）" />
          </NFormItem>
          
          <NFormItem label="使用 SSL">
            <NSwitch v-model:value="formData.useSSL" />
          </NFormItem>
        </template>

        <NFormItem label="启用状态">
          <NSwitch v-model:value="formData.enabled" />
        </NFormItem>
        
        <NFormItem label="默认存储">
          <NSwitch v-model:value="formData.isDefault" />
        </NFormItem>
      </NForm>
    </NModal>
  </div>
</template>
