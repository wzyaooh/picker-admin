<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from 'naive-ui';

import { computed, reactive, ref, watch, nextTick } from 'vue';

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

type MenuType = 'directory' | 'menu';

type FormValues = {
  componentPath: string;
  description: string;
  enabled: boolean;
  hidden: boolean;
  icon: string;
  keepAlive: boolean;
  layout: string;
  order: number;
  parentId: null | number;
  path: string;
  permissionKey: string;
  redirect: string;
  title: string;
  type: MenuType;
};

interface Props {
  parentOptions: SelectOption[];
  initialValues?: Partial<FormValues>;
  mode: 'create' | 'edit';
}

const props = withDefaults(defineProps<Props>(), {
  initialValues: () => ({}),
});

const emit = defineEmits<{
  submit: [FormValues];
  'update:type': [MenuType];
}>();

const show = defineModel<boolean>('show', { required: true });

const formRef = ref<FormInst | null>(null);
const isInitializing = ref(false);

const formModel = reactive<FormValues>({
  componentPath: '',
  description: '',
  enabled: true,
  hidden: false,
  icon: '',
  keepAlive: true,
  layout: 'default',
  order: 999,
  parentId: null,
  path: '',
  permissionKey: '',
  redirect: '',
  title: '',
  type: 'directory',
});

const title = computed(() =>
  props.mode === 'create' ? '新增菜单' : '编辑菜单',
);

const rules = computed((): FormRules => {
  return {
    title: [
      {
        required: true,
        message:
          formModel.type === 'directory' ? '请输入目录标题' : '请输入菜单标题',
        trigger: ['input', 'blur'],
      },
    ],
    type: [
      { required: true, message: '请选择类型', trigger: ['change', 'blur'] },
    ],
    parentId: [
      {
        validator: (_rule, value: null | number) => {
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
    componentPath: [
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
  formModel.parentId = props.initialValues?.parentId ?? null;
  formModel.title = (props.initialValues?.title ?? '').toString();

  // 类型转换：后端类型 -> 前端类型
  const backendType = String(props.initialValues?.type ?? '');
  if (backendType === 'CATALOG') {
    formModel.type = 'directory';
  } else if (backendType === 'MENU') {
    formModel.type = 'menu';
  } else {
    formModel.type = 'directory'; // 默认目录
  }

  formModel.path = (props.initialValues?.path ?? '').toString();
  formModel.permissionKey = (
    props.initialValues?.permissionKey ?? ''
  ).toString();
  formModel.icon = (props.initialValues?.icon ?? '').toString();
  formModel.componentPath = (
    props.initialValues?.componentPath ?? ''
  ).toString();
  formModel.hidden = Boolean(props.initialValues?.hidden ?? false);
  formModel.order = Number(props.initialValues?.order ?? 999);
  formModel.enabled = Boolean(props.initialValues?.enabled ?? true);
  formModel.redirect = (props.initialValues?.redirect ?? '').toString();
  formModel.layout = (props.initialValues?.layout ?? 'default').toString();
  formModel.keepAlive = Boolean(props.initialValues?.keepAlive ?? true);
  formModel.description = (props.initialValues?.description ?? '').toString();
}

watch(
  () => show.value,
  (val) => {
    if (!val) return;
    isInitializing.value = true;
    applyInitialValues();
    formRef.value?.restoreValidation();
    nextTick(() => {
      isInitializing.value = false;
    });
  },
);

watch(
  () => formModel.type,
  (newType) => {
    if (show.value && !isInitializing.value) {
      formRef.value?.restoreValidation();

      // 切换类型时清空上级目录，避免显示不匹配的选项
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
  } catch {
    return;
  }

  // 类型转换：前端类型 -> 后端类型
  const backendType = formModel.type === 'directory' ? 'CATALOG' : 'MENU';

  const submitData = {
    parentId: formModel.parentId,
    title: formModel.title.trim(),
    type: backendType as any,
    path: formModel.path.trim(),
    permissionKey: formModel.permissionKey.trim(),
    icon: formModel.icon.trim(),
    componentPath: formModel.componentPath.trim(),
    hidden: formModel.hidden,
    order: Number.isFinite(formModel.order) ? formModel.order : 0,
    enabled: formModel.enabled,
    redirect: formModel.redirect.trim(),
    layout: formModel.layout,
    keepAlive: formModel.keepAlive,
    description: formModel.description.trim(),
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
        <div class="flex w-full flex-col gap-2">
          <div class="flex gap-2">
            <NButton
              tertiary
              :type="formModel.type === 'directory' ? 'primary' : 'default'"
              :disabled="props.mode === 'edit'"
              @click="formModel.type = 'directory'"
            >
              目录
            </NButton>
            <NButton
              tertiary
              :type="formModel.type === 'menu' ? 'primary' : 'default'"
              :disabled="props.mode === 'edit'"
              @click="formModel.type = 'menu'"
            >
              菜单
            </NButton>
          </div>
          <div class="text-xs text-gray-500">
            {{
              formModel.type === 'directory'
                ? '目录只能在模块下创建'
                : '菜单只能在目录下创建'
            }}
          </div>
        </div>
      </NFormItem>

      <div class="grid grid-cols-2 gap-x-6">
        <NFormItem
          :label="formModel.type === 'directory' ? '目录标题' : '菜单标题'"
          path="title"
          class="col-span-1"
        >
          <NInput
            v-model:value="formModel.title"
            :placeholder="
              formModel.type === 'directory'
                ? '请输入目录标题'
                : '请输入菜单标题'
            "
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

      <NFormItem
        v-if="formModel.type === 'menu'"
        label="组件路径"
        path="componentPath"
      >
        <NInput
          v-model:value="formModel.componentPath"
          placeholder="请输入组件路径"
        />
      </NFormItem>

      <NFormItem
        v-if="formModel.type === 'menu'"
        label="布局类型"
        path="layout"
      >
        <NSelect
          v-model:value="formModel.layout"
          :options="[
            { label: '默认布局', value: 'default' },
            { label: '空白布局', value: 'blank' },
          ]"
          placeholder="请选择布局类型"
        />
      </NFormItem>

      <NFormItem label="重定向路径" path="redirect">
        <NInput
          v-model:value="formModel.redirect"
          placeholder="请输入重定向路径"
        />
      </NFormItem>

      <NFormItem label="描述" path="description">
        <NInput
          v-model:value="formModel.description"
          :rows="2"
          placeholder="请输入描述"
          type="textarea"
        />
      </NFormItem>

      <div class="grid grid-cols-2 gap-x-6">
        <NFormItem label="是否隐藏" path="hidden" class="col-span-1">
          <NSwitch v-model:value="formModel.hidden" />
        </NFormItem>

        <NFormItem
          v-if="formModel.type === 'menu'"
          label="页面缓存"
          path="keepAlive"
          class="col-span-1"
        >
          <NSwitch v-model:value="formModel.keepAlive" />
        </NFormItem>
      </div>

      <div class="grid grid-cols-2 gap-x-6">
        <NFormItem label="菜单排序" path="order" class="col-span-1">
          <NInputNumber
            v-model:value="formModel.order"
            :min="0"
            class="w-full"
          />
        </NFormItem>
      </div>

      <NFormItem label="状态" path="enabled">
        <NSwitch v-model:value="formModel.enabled" />
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
