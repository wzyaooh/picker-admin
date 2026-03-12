<script setup lang="ts">
/**
 * 用户弹窗组件
 *
 * 提供用户的创建和编辑功能，包括：
 * - 用户名输入（创建时可编辑，编辑时禁用）
 * - 密码输入（创建时必填，编辑时可选）
 * - 部门选择（树形选择器）
 * - 岗位选择（下拉选择器）
 * - 角色选择（多选下拉选择器）
 * - 状态开关（启用/停用）
 *
 * 组件支持两种模式：
 * - create: 创建新用户，所有字段可编辑，密码必填
 * - edit: 编辑现有用户，用户名不可编辑，密码可选
 *
 * @example
 * ```vue
 * <UserModal
 *   v-model:show="modalOpen"
 *   :mode="modalMode"
 *   :initial-values="modalInitialValues"
 *   :existing-usernames="existingUsernames"
 *   :original-username="originalUsername"
 *   @submit="handleUserSubmit"
 * />
 * ```
 */

import type { FormInst, FormRules, SelectOption } from 'naive-ui';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NSwitch,
  NTreeSelect,
} from 'naive-ui';

import {
  getAllRolesApi,
  getDepartmentTreeApi,
  getPositionListApi,
} from '#/api';

/**
 * 表单数据类型
 */
type FormValues = {
  /** 部门ID */
  departmentId: null | number;
  /** 是否启用 */
  enabled: boolean;
  /** 岗位ID */
  positionId: null | number;
  /** 角色ID列表 */
  roleIds: number[];
  /** 用户名（1-50字符） */
  username: string;
};

/**
 * 组件 Props
 */
interface Props {
  /** 已存在的用户名列表（用于验证重复） */
  existingUsernames?: string[];
  /** 表单初始值 */
  initialValues?: Partial<FormValues>;
  /** 弹窗模式：创建或编辑 */
  mode: 'create' | 'edit';
  /** 原始用户名（编辑时使用，用于排除自身的重复检查） */
  originalUsername?: string;
}

/**
 * 组件 Emits
 */
interface Emits {
  /** 表单提交时触发 */
  (e: 'submit', values: FormValues): void;
}

const props = withDefaults(defineProps<Props>(), {
  existingUsernames: () => [],
  initialValues: () => ({}),
  originalUsername: undefined,
});

const emit = defineEmits<Emits>();

/** 弹窗显示状态 */
const show = defineModel<boolean>('show', { required: true });

/** 表单引用 */
const formRef = ref<FormInst | null>(null);

/**
 * 表单数据模型
 */
const formModel = reactive<FormValues>({
  username: '',
  enabled: true,
  departmentId: null,
  positionId: null,
  roleIds: [],
});

/**
 * 弹窗标题
 * 根据模式动态显示"新增用户"或"编辑用户"
 */
const title = computed(() =>
  props.mode === 'create' ? '新增用户' : '编辑用户',
);

// ==================== 角色数据 ====================

/** 角色选项列表 */
const roleOptions = ref<SelectOption[]>([]);

/** 角色加载状态 */
const loadingRoles = ref(false);

/**
 * 获取角色列表
 *
 * 从后端获取所有角色数据，用于角色选择器。
 */
async function fetchRoles() {
  loadingRoles.value = true;
  try {
    const roles = await getAllRolesApi();
    roleOptions.value = roles.map((role) => ({
      label: role.name,
      value: role.id,
    }));
  } catch (error) {
    console.error('Failed to fetch roles:', error);
  } finally {
    loadingRoles.value = false;
  }
}

// ==================== 部门数据 ====================

/** 部门树形选项列表 */
const departmentOptions = ref<any[]>([]);

/** 部门加载状态 */
const loadingDepartments = ref(false);

/**
 * 获取部门树
 *
 * 从后端获取部门树形数据，用于部门树形选择器。
 */
async function fetchDepartments() {
  loadingDepartments.value = true;
  try {
    const departments = await getDepartmentTreeApi();
    departmentOptions.value = departments;
  } catch (error) {
    console.error('Failed to fetch departments:', error);
  } finally {
    loadingDepartments.value = false;
  }
}

// ==================== 岗位数据 ====================

/** 岗位选项列表 */
const positionOptions = ref<SelectOption[]>([]);

/** 岗位加载状态 */
const loadingPositions = ref(false);

/**
 * 获取岗位列表
 *
 * 从后端获取岗位数据，用于岗位选择器。
 */
async function fetchPositions() {
  loadingPositions.value = true;
  try {
    const result = await getPositionListApi({ pageSize: 100 });
    positionOptions.value = result.pageData.map((position) => ({
      label: position.name,
      value: position.id,
    }));
  } catch (error) {
    console.error('Failed to fetch positions:', error);
  } finally {
    loadingPositions.value = false;
  }
}

// 组件挂载时获取所有选项数据
onMounted(() => {
  fetchRoles();
  fetchDepartments();
  fetchPositions();
});

// ==================== 表单验证 ====================

/**
 * 表单验证规则
 *
 * 根据模式（创建/编辑）动态生成验证规则：
 * - 创建模式：用户名必填，密码必填且至少6位，确认密码必须一致
 * - 编辑模式：用户名不可编辑，密码可选（留空则不修改），如果填写则至少6位
 */
const rules = computed((): FormRules => {
  return {
    username: [
      {
        required: true,
        message: '请输入用户名',
        trigger: ['input', 'blur'],
      },
      {
        validator: (_rule, value: string) => {
          const v = (value || '').trim();
          if (!v) return true;

          const lower = v.toLowerCase();
          const original = (props.originalUsername || '').trim().toLowerCase();

          // 编辑模式下，如果用户名与原始用户名相同，则不检查重复
          if (props.mode === 'edit' && original && lower === original) {
            return true;
          }

          // 检查用户名是否已存在
          const exists = props.existingUsernames.some(
            (u) => (u || '').trim().toLowerCase() === lower,
          );
          return exists ? new Error('用户名已存在') : true;
        },
        trigger: ['input', 'blur'],
      },
    ],
  };
});

// ==================== 表单数据管理 ====================

/**
 * 应用初始值到表单
 *
 * 将 Props 中的初始值应用到表单模型中。
 * 密码字段始终清空，以确保安全性。
 */
function applyInitialValues() {
  formModel.username = (props.initialValues?.username ?? '').toString();
  formModel.enabled = Boolean(props.initialValues?.enabled ?? true);
  formModel.departmentId = props.initialValues?.departmentId ?? null;
  formModel.positionId = props.initialValues?.positionId ?? null;
  formModel.roleIds = props.initialValues?.roleIds ?? [];
}

// 监听弹窗显示状态，显示时应用初始值并重置验证
watch(
  () => show.value,
  (val) => {
    if (!val) {
      return;
    }
    applyInitialValues();
    formRef.value?.restoreValidation();
  },
);

// 监听初始值变化，弹窗显示时应用新的初始值
watch(
  () => props.initialValues,
  () => {
    if (show.value) {
      applyInitialValues();
      formRef.value?.restoreValidation();
    }
  },
  { deep: true },
);

// ==================== 表单提交 ====================

/**
 * 处理表单提交
 *
 * 验证表单数据，验证通过后触发 submit 事件。
 * 提交的数据包含所有表单字段，用户名会自动去除首尾空格。
 */
async function handleSubmit() {
  const form = formRef.value;
  if (!form) {
    return;
  }

  // 验证表单
  await form.validate();

  // 构建提交数据
  const submitData: FormValues = {
    username: formModel.username.trim(),
    enabled: formModel.enabled,
    departmentId: formModel.departmentId,
    positionId: formModel.positionId,
    roleIds: formModel.roleIds,
  };

  // 触发提交事件
  emit('submit', submitData);
}
</script>

<template>
  <NModal v-model:show="show" preset="card" :title="title" class="w-[520px]">
    <NForm
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-placement="left"
      label-width="90"
    >
      <!-- 用户名 -->
      <NFormItem label="用户名" path="username">
        <NInput
          v-model:value="formModel.username"
          placeholder="请输入用户名"
          :disabled="mode === 'edit'"
        />
      </NFormItem>

      <!-- 部门 -->
      <NFormItem label="部门" path="departmentId">
        <NTreeSelect
          v-model:value="formModel.departmentId"
          :options="departmentOptions"
          :loading="loadingDepartments"
          placeholder="请选择部门"
          clearable
          key-field="id"
          label-field="name"
          children-field="children"
        />
      </NFormItem>

      <!-- 岗位 -->
      <NFormItem label="岗位" path="positionId">
        <NSelect
          v-model:value="formModel.positionId"
          :options="positionOptions"
          :loading="loadingPositions"
          placeholder="请选择岗位"
          clearable
        />
      </NFormItem>

      <!-- 角色 -->
      <NFormItem label="角色" path="roleIds">
        <NSelect
          v-model:value="formModel.roleIds"
          :options="roleOptions"
          :loading="loadingRoles"
          multiple
          placeholder="请选择角色"
          clearable
        />
      </NFormItem>

      <!-- 状态 -->
      <NFormItem label="状态" path="enabled">
        <NSwitch v-model:value="formModel.enabled" />
      </NFormItem>
    </NForm>

    <!-- 底部按钮 -->
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
