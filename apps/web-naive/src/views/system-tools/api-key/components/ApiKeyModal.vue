<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { NModal, NAlert, NButton, NIcon, NDivider, NSteps, NStep, NInput } from 'naive-ui';
import { IconifyIcon } from '@vben/icons';
import { useVbenForm, z } from '#/adapter/form';
import { message } from '#/adapter/naive';
import { 
  createApiKeyApi, 
  updateApiKeyApi, 
  getApiKeyApi,
  getAvailablePermissionsApi,
  type ApiKeyApi,
} from '#/api/modules/api-key';
import PermissionSelector from './PermissionSelector.vue';

interface Props {
  show: boolean;
  editingId?: string | null;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'submit'): void;
}

const props = withDefaults(defineProps<Props>(), {
  editingId: null,
});

const emit = defineEmits<Emits>();

const loading = ref(false);
const permissionOptions = ref<Array<{
  code: string;
  name: string;
  description: string;
  category: string;
  children?: Array<{
    code: string;
    name: string;
    description: string;
    method: string;
    path: string;
  }>;
}>>([]);
const createdApiKey = ref<string>('');
const showCreatedKey = ref(false);

// 步骤控制
const currentStep = ref(1);
const totalSteps = 3;

// 第一步表单配置 - 基本信息
const [BasicForm, basicFormApi] = useVbenForm({
  showDefaultActions: false,
  schema: [
    {
      component: 'Input',
      componentProps: { placeholder: '请输入 API Key 名称' },
      fieldName: 'name',
      label: '名称',
      rules: z.string().min(1, { message: '请输入名称' }).max(50, { message: '名称不能超过50个字符' }),
    },
    {
      component: 'Input',
      componentProps: { 
        placeholder: '请输入描述（可选）',
        type: 'textarea',
        rows: 3,
      },
      fieldName: 'description',
      label: '描述',
      rules: z.string().max(200, { message: '描述不能超过200个字符' }).optional(),
    },
  ],
});

// 第二步表单配置 - 限制设置
const [SettingsForm, settingsFormApi] = useVbenForm({
  showDefaultActions: false,
  schema: [
    {
      component: 'InputNumber',
      componentProps: { 
        placeholder: '请输入限流值（次/小时）',
        min: 1,
        max: 10000,
      },
      fieldName: 'rateLimit',
      label: '限流',
      rules: z.number().min(1, { message: '限流值不能小于1' }).max(10000, { message: '限流值不能大于10000' }).optional(),
    },
    {
      component: 'DatePicker',
      componentProps: { 
        type: 'datetime',
        placeholder: '请选择过期时间（可选）',
        clearable: true,
      },
      fieldName: 'expiresAt',
      label: '过期时间',
      rules: z.string().optional(),
    },
  ],
});

const isEdit = computed(() => !!props.editingId);
const modalTitle = computed(() => isEdit.value ? '编辑 API Key' : '新增 API Key');

// 权限选择相关
const selectedPermissions = ref<string[]>([]);
const permissionError = ref<string>('');

// 步骤控制
function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

function resetSteps() {
  currentStep.value = 1;
}

// 验证当前步骤
async function validateCurrentStep(): Promise<boolean> {
  return await validateStep(currentStep.value);
}

// 监听弹窗显示状态
watch(() => props.show, async (newVal) => {
  if (newVal) {
    showCreatedKey.value = false;
    createdApiKey.value = '';
    resetSteps();
    
    // 加载权限选项
    await loadPermissions();
    
    if (isEdit.value && props.editingId) {
      await loadApiKeyData();
    } else {
      basicFormApi.resetForm();
      settingsFormApi.resetForm();
      selectedPermissions.value = [];
      permissionError.value = '';
      // 设置默认值
      settingsFormApi.setValues({
        rateLimit: 1000,
      });
    }
  }
});

// 加载权限选项
async function loadPermissions() {
  try {
    const permissions = await getAvailablePermissionsApi();
    permissionOptions.value = permissions;
  } catch (error) {
    console.error('Failed to load permissions:', error);
  }
}

// 加载 API Key 数据
async function loadApiKeyData() {
  if (!props.editingId) return;
  
  try {
    loading.value = true;
    const apiKey = await getApiKeyApi(props.editingId);
    selectedPermissions.value = apiKey.permissions || [];
    
    // 设置基本信息表单
    basicFormApi.setValues({
      name: apiKey.name,
      description: apiKey.description || '',
    });
    
    // 设置限制设置表单
    settingsFormApi.setValues({
      rateLimit: apiKey.rateLimit,
      expiresAt: apiKey.expiresAt || undefined,
    });
  } catch (error) {
    // 错误已被拦截器处理
  } finally {
    loading.value = false;
  }
}

// 处理下一步或提交
async function handleNext() {
  if (isEdit.value) {
    // 编辑模式：验证所有表单
    const basicValid = await validateStep(1);
    const settingsValid = await validateStep(2);
    const permissionsValid = await validateStep(3);
    
    if (basicValid && settingsValid && permissionsValid) {
      await handleSubmit();
    }
  } else {
    // 创建模式：步骤式验证
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    if (currentStep.value < totalSteps) {
      nextStep();
    } else {
      await handleSubmit();
    }
  }
}

// 验证指定步骤
async function validateStep(step: number): Promise<boolean> {
  try {
    switch (step) {
      case 1:
        await basicFormApi.validate();
        return true;
      case 2:
        await settingsFormApi.validate();
        return true;
      case 3:
        if (selectedPermissions.value.length === 0) {
          permissionError.value = '请至少选择一个权限';
          return false;
        }
        permissionError.value = '';
        return true;
      default:
        return true;
    }
  } catch (error) {
    return false;
  }
}

// 提交表单
async function handleSubmit() {
  try {
    loading.value = true;
    
    // 收集所有表单数据
    const basicValues = await basicFormApi.getValues();
    const settingsValues = await settingsFormApi.getValues();
    
    const submitData = {
      ...basicValues,
      ...settingsValues,
      permissions: selectedPermissions.value,
    };
    
    if (isEdit.value && props.editingId) {
      await updateApiKeyApi(props.editingId, submitData as ApiKeyApi.UpdateParams);
      message.success('更新成功');
      emit('submit');
      emit('update:show', false);
    } else {
      const result = await createApiKeyApi(submitData as ApiKeyApi.CreateParams);
      message.success('创建成功');
      
      // 显示完整的 API Key
      createdApiKey.value = result.fullKey;
      showCreatedKey.value = true;
      
      emit('submit');
    }
  } catch (error) {
    // 错误已被拦截器处理
  } finally {
    loading.value = false;
  }
}

// 复制 API Key
async function copyApiKey() {
  try {
    await navigator.clipboard.writeText(createdApiKey.value);
    message.success('已复制到剪贴板');
  } catch (error) {
    message.error('复制失败，请手动复制');
  }
}

// 关闭弹窗
function handleClose() {
  if (showCreatedKey.value) {
    // 如果正在显示新创建的 API Key，直接关闭并重置状态
    showCreatedKey.value = false;
    createdApiKey.value = '';
  }
  emit('update:show', false);
}

// 完成创建
function handleFinishCreate() {
  showCreatedKey.value = false;
  createdApiKey.value = '';
  emit('update:show', false);
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="modalTitle"
    style="width: 700px"
    @close="handleClose"
  >
    <!-- 显示新创建的 API Key -->
    <div v-if="showCreatedKey" class="space-y-4">
      <NAlert type="success" title="API Key 创建成功">
        请立即保存以下 API Key，关闭后将无法再次查看完整密钥。
      </NAlert>
      
      <div class="space-y-2">
        <div class="text-sm font-medium">完整 API Key：</div>
        <div class="flex items-center space-x-2">
          <NInput 
            :value="createdApiKey" 
            readonly 
            class="flex-1"
            type="textarea"
            :rows="2"
            style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 12px;"
          />
          <NButton size="small" @click="copyApiKey">
            复制
            <template #icon>
              <NIcon><IconifyIcon icon="lucide:copy" /></NIcon>
            </template>
          </NButton>
        </div>
      </div>
    </div>

    <!-- 步骤式表单 -->
    <div v-else>
      <!-- 编辑模式：显示所有表单 -->
      <div v-if="isEdit">
        <div class="space-y-6">
          <!-- 基本信息 -->
          <div>
            <h3 class="text-lg font-medium mb-4">基本信息</h3>
            <BasicForm />
          </div>

          <NDivider />

          <!-- 限制设置 -->
          <div>
            <h3 class="text-lg font-medium mb-4">限制设置</h3>
            <SettingsForm />
          </div>

          <NDivider />

          <!-- 权限配置 -->
          <div>
            <h3 class="text-lg font-medium mb-4">权限配置</h3>
            <PermissionSelector
              :permissions="permissionOptions"
              v-model="selectedPermissions"
              :error="permissionError"
            />
          </div>
        </div>
      </div>

      <!-- 创建模式：步骤式表单 -->
      <div v-else>
        <!-- 步骤指示器 -->
        <div class="mb-6">
          <NSteps :current="currentStep" :status="loading ? 'process' : 'wait'">
            <NStep title="基本信息" description="设置 API Key 名称和描述" />
            <NStep title="限制设置" description="配置限流和过期时间" />
            <NStep title="权限配置" description="选择 API Key 权限" />
          </NSteps>
        </div>

        <!-- 步骤内容 -->
        <div class="min-h-[300px]">
          <!-- 第一步：基本信息 -->
          <div v-show="currentStep === 1">
            <div class="mb-4">
              <h3 class="text-lg font-medium mb-2">基本信息</h3>
              <p class="text-sm opacity-60 mb-4">请填写 API Key 的基本信息，名称将用于识别此密钥。</p>
            </div>
            <BasicForm />
          </div>

          <!-- 第二步：限制设置 -->
          <div v-show="currentStep === 2">
            <div class="mb-4">
              <h3 class="text-lg font-medium mb-2">限制设置</h3>
              <p class="text-sm opacity-60 mb-4">配置 API Key 的使用限制，包括请求频率和有效期。</p>
            </div>
            <SettingsForm />
          </div>

          <!-- 第三步：权限配置 -->
          <div v-show="currentStep === 3">
            <div class="mb-4">
              <h3 class="text-lg font-medium mb-2">权限配置</h3>
              <p class="text-sm opacity-60 mb-4">选择此 API Key 可以访问的功能权限。</p>
            </div>
            
            <PermissionSelector
              :permissions="permissionOptions"
              v-model="selectedPermissions"
              :error="permissionError"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <!-- 左侧按钮 -->
        <div>
          <NButton 
            v-if="!showCreatedKey && currentStep > 1 && !isEdit" 
            @click="prevStep"
          >
            上一步
          </NButton>
        </div>
        
        <!-- 右侧按钮 -->
        <div class="flex gap-3">
          <NButton @click="handleClose">
            {{ showCreatedKey ? '关闭' : '取消' }}
          </NButton>
          
          <NButton 
            v-if="showCreatedKey" 
            type="primary" 
            @click="handleFinishCreate"
          >
            我已保存，完成创建
          </NButton>
          
          <NButton 
            v-else
            type="primary" 
            :loading="loading"
            @click="handleNext"
          >
            {{ isEdit ? '保存' : (currentStep === totalSteps ? '创建' : '下一步') }}
          </NButton>
        </div>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
/* 权限选择区域的自定义样式 */
.permission-item {
  transition: all 0.2s ease;
}

.permission-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 深色模式下的悬停效果 */
.dark .permission-item:hover {
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
}

/* 滚动条样式 */
.max-h-60::-webkit-scrollbar {
  width: 6px;
}

.max-h-60::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-60::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.dark .max-h-60::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.max-h-60::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.dark .max-h-60::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
