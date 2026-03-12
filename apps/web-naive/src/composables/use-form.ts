import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import type { FormInst } from 'naive-ui';

/**
 * 表单管理 Composable
 *
 * 提供表单的验证、提交、重置等功能。
 * 支持表单验证、加载状态管理、错误处理等。
 *
 * 功能特性：
 * - 表单验证
 * - 提交状态管理
 * - 错误处理
 * - 表单重置
 * - 字段错误管理
 *
 * @template T 表单数据类型
 * @param submitFn 表单提交函数
 * @param options 配置选项
 * @returns 表单相关的状态和方法
 *
 * @example
 * ```typescript
 * // 基本使用
 * const { formRef, formData, submitting, handleSubmit, resetForm } = useForm(
 *   createUserApi,
 *   { defaultData: { username: '', email: '' } }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // 带成功和失败回调
 * const form = useForm(createUserApi, {
 *   defaultData: { username: '', email: '' },
 *   onSuccess: (result) => {
 *     message.success('创建成功');
 *     router.push('/users');
 *   },
 *   onError: (error) => {
 *     console.error('创建失败:', error);
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // 完整示例
 * const {
 *   formRef,
 *   formData,
 *   submitting,
 *   errors,
 *   hasErrors,
 *   validate,
 *   handleSubmit,
 *   resetForm,
 * } = useForm(createUserApi, {
 *   defaultData: { username: '', email: '' },
 * });
 *
 * // 在模板中使用
 * <NForm ref="formRef" :model="formData">
 *   <NFormItem label="用户名" path="username">
 *     <NInput v-model:value="formData.username" />
 *   </NFormItem>
 * </NForm>
 * <NButton :loading="submitting" @click="handleSubmit">提交</NButton>
 * ```
 */
export function useForm<T = any>(
  submitFn: (data: T) => Promise<any>,
  options: UseFormOptions<T> = {}
) {
  const { defaultData = {} as T, onSuccess, onError } = options;

  /** 表单引用 */
  const formRef = ref<FormInst | null>(null);

  /** 表单数据 */
  const formData = ref<T>({ ...defaultData }) as Ref<T>;

  /** 提交状态 */
  const submitting = ref(false);

  /** 验证错误 */
  const errors = ref<Record<string, string>>({});

  /** 是否有错误 */
  const hasErrors = computed(() => Object.keys(errors.value).length > 0);

  /**
   * 验证表单
   *
   * 调用 Naive UI 表单的 validate 方法进行验证。
   * 验证成功返回 true，失败返回 false 并记录错误信息。
   *
   * @returns Promise<boolean> 验证是否通过
   *
   * @example
   * ```typescript
   * // 手动验证表单
   * const valid = await validate();
   * if (valid) {
   *   console.log('验证通过');
   * }
   * ```
   */
  async function validate(): Promise<boolean> {
    if (!formRef.value) return false;

    try {
      await formRef.value.validate();
      errors.value = {};
      return true;
    } catch (error: any) {
      errors.value = error || {};
      return false;
    }
  }

  /**
   * 提交表单
   *
   * 先验证表单，验证通过后调用提交函数。
   * 提交过程中显示加载状态，成功或失败后调用相应的回调。
   *
   * @returns Promise<any> 提交结果
   *
   * @example
   * ```typescript
   * // 提交表单
   * async function onSubmit() {
   *   try {
   *     const result = await handleSubmit();
   *     console.log('提交成功:', result);
   *   } catch (error) {
   *     console.error('提交失败:', error);
   *   }
   * }
   * ```
   */
  async function handleSubmit() {
    const valid = await validate();
    if (!valid) return;

    submitting.value = true;
    try {
      const result = await submitFn(formData.value);
      onSuccess?.(result);
      return result;
    } catch (error) {
      onError?.(error);
      throw error;
    } finally {
      submitting.value = false;
    }
  }

  /**
   * 重置表单
   *
   * 恢复表单验证状态，将表单数据重置为默认值，清空错误信息。
   *
   * @example
   * ```typescript
   * // 重置表单
   * function handleReset() {
   *   resetForm();
   * }
   * ```
   */
  function resetForm() {
    formRef.value?.restoreValidation();
    formData.value = { ...defaultData };
    errors.value = {};
  }

  /**
   * 设置表单数据
   *
   * 更新表单数据（部分更新）。
   * 常用于表单字段的批量更新。
   *
   * @param data 要更新的表单数据（部分更新）
   *
   * @example
   * ```typescript
   * // 更新部分字段
   * setFormData({ username: 'admin', enabled: true });
   * ```
   */
  function setFormData(data: Partial<T>) {
    formData.value = { ...formData.value, ...data };
  }

  /**
   * 设置字段错误
   *
   * 手动设置某个字段的错误信息。
   * 常用于服务器端验证失败后显示错误。
   *
   * @param field 字段名
   * @param message 错误消息
   *
   * @example
   * ```typescript
   * // 设置用户名字段错误
   * setFieldError('username', '用户名已存在');
   * ```
   */
  function setFieldError(field: string, message: string) {
    errors.value[field] = message;
  }

  /**
   * 清除字段错误
   *
   * 清除某个字段的错误信息。
   *
   * @param field 字段名
   *
   * @example
   * ```typescript
   * // 清除用户名字段错误
   * clearFieldError('username');
   * ```
   */
  function clearFieldError(field: string) {
    delete errors.value[field];
  }

  /**
   * 清除所有错误
   *
   * 清除所有字段的错误信息。
   *
   * @example
   * ```typescript
   * // 清除所有错误
   * clearErrors();
   * ```
   */
  function clearErrors() {
    errors.value = {};
  }

  return {
    /** 表单引用 */
    formRef,
    /** 表单数据 */
    formData,
    /** 提交状态 */
    submitting,
    /** 验证错误 */
    errors,
    /** 是否有错误 */
    hasErrors,
    /** 验证表单 */
    validate,
    /** 提交表单 */
    handleSubmit,
    /** 重置表单 */
    resetForm,
    /** 设置表单数据 */
    setFormData,
    /** 设置字段错误 */
    setFieldError,
    /** 清除字段错误 */
    clearFieldError,
    /** 清除所有错误 */
    clearErrors,
  };
}

/**
 * useForm 配置选项
 */
export interface UseFormOptions<T = any> {
  /** 默认表单数据 */
  defaultData?: T;
  /** 提交成功回调 */
  onSuccess?: (result: any) => void;
  /** 提交失败回调 */
  onError?: (error: any) => void;
}
