/**
 * Modal 通用逻辑
 */
import { ref, watch } from 'vue';

/**
 * Modal 基础 Hook
 * 处理 Modal 显示/隐藏时的状态重置
 */
export function useModal<T = any>(options: {
  onShow?: () => void;
  onHide?: () => void;
  resetState?: () => void;
} = {}) {
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * 重置状态
   */
  function reset() {
    loading.value = false;
    error.value = null;
    options.resetState?.();
  }

  /**
   * 创建 watch 函数
   */
  function createShowWatcher(showRef: () => boolean) {
    return watch(showRef, (newVal) => {
      if (newVal) {
        reset();
        options.onShow?.();
      } else {
        options.onHide?.();
      }
    });
  }

  return {
    loading,
    error,
    reset,
    createShowWatcher,
  };
}

/**
 * 表单 Modal Hook
 * 专门用于表单类型的 Modal
 */
export function useFormModal<T = any>(options: {
  onShow?: () => void;
  onHide?: () => void;
  resetForm?: () => void;
} = {}) {
  const submitting = ref(false);

  const modal = useModal({
    ...options,
    resetState: options.resetForm,
  });

  /**
   * 提交表单
   */
  async function submit(submitFn: () => Promise<T>): Promise<T | null> {
    submitting.value = true;
    modal.error.value = null;

    try {
      const result = await submitFn();
      return result;
    } catch (error: any) {
      modal.error.value = error?.message || '操作失败';
      throw error;
    } finally {
      submitting.value = false;
    }
  }

  return {
    ...modal,
    submitting,
    submit,
  };
}
