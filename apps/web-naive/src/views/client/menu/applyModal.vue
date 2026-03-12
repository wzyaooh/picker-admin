<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from 'naive-ui';

import { computed, reactive, ref, watch } from 'vue';

import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSwitch,
} from 'naive-ui';

import IconPicker from '#/components/IconPicker.vue';

import type { BackendMenuType, FrontendMenuType } from './types';

type FormValues = {
  enable: boolean;
  hidden: boolean;
  icon: string;
  order: number;
  parentId: number | null;
  path: string;
  code: string;
  name: string;
  type: FrontendMenuType;
  component: string;
};

// Props 接受后端类型
type PropsFormValues = {
  enable?: boolean;
  hidden?: boolean;
  icon?: string;
  order?: number;
  parentId?: number | null;
  path?: string;
  code?: string;
  name?: string;
  type?: BackendMenuType; // 接受后端类型
  component?: string;
};

interface Props {
  parentOptions: SelectOption[];
  initialValues?: PropsFormValues;
  mode: 'create' | 'edit';
}

const props = withDefaults(defineProps<Props>(), {
  initialValues: () => ({}),
});

const emit = defineEmits<{ 
  submit: [FormValues];
  'update:type': [FrontendMenuType];
}>();

const show = defineModel<boolean>('show', { required: true });

const formRef = ref<FormInst | null>(null);

// 标志：是否正在初始化（避免 watch 清空 parentId）
const isInitializing = ref(false);

const formModel = reactive<FormValues>({
  enable: true,
  hidden: false,
  icon: '',
  order: 999,
  parentId: null,
  path: '',
  code: '',
  name: '',
  type: 'directory',
  component: '',
});

const title = computed(() => (props.mode === 'create' ? '新增菜单' : '编辑菜单'));

const rules = computed((): FormRules => {
  return {
    name: [{ 
      required: true, 
      message: formModel.type === 'directory' ? '请输入目录名称' : '请输入菜单名称', 
      trigger: ['input', 'blur'] 
    }],
    type: [{ required: true, message: '请选择类型', trigger: ['change', 'blur'] }],
    parentId: [
      {
        validator: (_rule, value: number | null) => {
          // 只有菜单类型需要选择父级（目录）
          if (formModel.type === 'menu' && !value) {
            return new Error('请选择上级目录');
          }
          return true;
        },
        trigger: ['change', 'blur'],
      },
    ],
    path: [
      {
        validator: (_rule, value: string) => {
          const v = (value || '').trim();
          return v ? true : new Error('请输入路由地址');
        },
        trigger: ['input', 'blur'],
      },
    ],
    component: [
      {
        validator: (_rule, value: string) => {
          const v = (value || '').trim();
          if (formModel.type !== 'menu') {
            return true;
          }
          return v ? true : new Error('请输入组件路径');
        },
        trigger: ['input', 'blur'],
      },
    ],
  };
});

function applyInitialValues() {
  isInitializing.value = true;
  
  formModel.parentId = props.initialValues?.parentId ?? null;
  formModel.name = (props.initialValues?.name ?? '').toString();
  
  // 类型转换：后端类型 -> 前端类型
  const backendType = props.initialValues?.type;
  if (backendType === 'CATALOG') {
    formModel.type = 'directory';
  } else if (backendType === 'MENU') {
    formModel.type = 'menu';
  } else {
    formModel.type = 'directory'; // 默认目录
  }
  
  formModel.path = (props.initialValues?.path ?? '').toString();
  formModel.code = (props.initialValues?.code ?? '').toString();
  formModel.icon = (props.initialValues?.icon ?? '').toString();
  formModel.component = (props.initialValues?.component ?? '').toString();
  formModel.hidden = Boolean(props.initialValues?.hidden ?? false);
  formModel.order = Number(props.initialValues?.order ?? 999);
  formModel.enable = Boolean(props.initialValues?.enable ?? true);
  
  // 初始化完成后，重置标志
  setTimeout(() => {
    isInitializing.value = false;
  }, 0);
}

watch(
  () => show.value,
  (val) => {
    if (!val) return;
    applyInitialValues();
    formRef.value?.restoreValidation();
  },
);

watch(
  () => formModel.type,
  (newType) => {
    if (show.value && !isInitializing.value) {
      formRef.value?.restoreValidation();
      
      // 当切换类型时，清空 parentId（让用户重新选择）
      formModel.parentId = null;
      
      // 通知父组件类型已改变，以便更新父级选项
      emit('update:type', newType);
    }
  },
);

async function handleSubmit() {
  const form = formRef.value;
  if (!form) {
    return;
  }

  try {
    await form.validate();
  } catch (error) {
    return;
  }

  // 类型转换：前端类型 -> 后端类型
  const backendType = formModel.type === 'directory' ? 'CATALOG' : 'MENU';

  const submitData = {
    parentId: formModel.parentId,
    name: formModel.name.trim(),
    type: backendType as any,
    path: formModel.path.trim(),
    code: formModel.code.trim(),
    icon: formModel.icon.trim(),
    component: formModel.component.trim(),
    hidden: formModel.hidden,
    order: Number.isFinite(formModel.order) ? formModel.order : 0,
    enable: formModel.enable,
  };

  emit('submit', submitData);
}
</script>

<template>
  <NModal v-model:show="show" preset="card" :title="title" class="w-[640px]">
    <NForm
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-placement="left"
      label-width="88"
    >
      <NFormItem label="菜单类型" path="type">
        <div class="flex flex-col gap-2 w-full">
          <div class="flex gap-2">
            <NButton
              tertiary
              :type="formModel.type === 'directory' ? 'primary' : 'default'"
              @click="formModel.type = 'directory'"
            >
              目录
            </NButton>
            <NButton
              tertiary
              :type="formModel.type === 'menu' ? 'primary' : 'default'"
              @click="formModel.type = 'menu'"
            >
              菜单
            </NButton>
          </div>
          <div class="text-xs text-gray-500">
            {{ formModel.type === 'directory' ? '目录只能在模块下创建' : '菜单只能在目录下创建' }}
          </div>
        </div>
      </NFormItem>

      <div class="grid grid-cols-2 gap-x-6">
        <NFormItem 
          :label="formModel.type === 'directory' ? '目录名称' : '菜单名称'" 
          path="name" 
          class="col-span-1"
        >
          <NInput 
            v-model:value="formModel.name" 
            :placeholder="formModel.type === 'directory' ? '请输入目录名称' : '请输入菜单名称'" 
            maxlength="30" 
            show-count 
          />
        </NFormItem>

        <NFormItem 
          :label="formModel.type === 'directory' ? '目录图标' : '菜单图标'" 
          path="icon" 
          class="col-span-1"
        >
          <IconPicker v-model:value="formModel.icon" placeholder="请选择图标" />
        </NFormItem>
      </div>

      <NFormItem 
        v-if="formModel.type === 'menu'"
        label="上级目录" 
        path="parentId"
      >
        <NSelect
          v-model:value="formModel.parentId"
          :options="parentOptions"
          placeholder="请选择上级目录"
        />
      </NFormItem>

      <NFormItem label="路由地址" path="path">
        <NInput v-model:value="formModel.path" placeholder="请输入路由地址" />
      </NFormItem>

      <NFormItem label="权限标识" path="code">
        <NInput v-model:value="formModel.code" placeholder="请输入权限标识" />
      </NFormItem>

      <NFormItem v-if="formModel.type === 'menu'" label="组件路径" path="component">
        <NInput v-model:value="formModel.component" placeholder="请输入组件路径" />
      </NFormItem>

      <div class="grid grid-cols-2 gap-x-6">
        <NFormItem label="是否隐藏" path="hidden" class="col-span-1">
          <NSwitch v-model:value="formModel.hidden" />
        </NFormItem>

        <NFormItem label="菜单排序" path="order" class="col-span-1">
          <NInputNumber v-model:value="formModel.order" :min="0" class="w-full" />
        </NFormItem>
      </div>

      <NFormItem label="状态" path="enable">
        <NSwitch v-model:value="formModel.enable" />
      </NFormItem>
    </NForm>

    <template #footer>
      <div class="flex justify-end">
        <div class="flex gap-3">
          <NButton tertiary @click="show = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">保存</NButton>
        </div>
      </div>
    </template>
  </NModal>
</template>
