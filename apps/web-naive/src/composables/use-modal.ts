import { ref, computed } from 'vue';
import type { Ref } from 'vue';

/**
 * 弹窗管理 Composable
 *
 * 提供弹窗的显示、隐藏、模式切换、数据管理等功能。
 * 支持创建和编辑两种模式，自动管理表单数据。
 *
 * 功能特性：
 * - 显示/隐藏控制
 * - 创建/编辑模式切换
 * - 表单数据管理
 * - 自动重置数据
 *
 * @template T 表单数据类型
 * @param options 配置选项
 * @returns 弹窗相关的状态和方法
 *
 * @example
 * ```typescript
 * // 基本使用
 * const { visible, mode, formData, openCreate, openEdit, close } = useModal<User>();
 *
 * // 打开创建弹窗
 * openCreate();
 *
 * // 打开编辑弹窗
 * openEdit({ id: 1, name: 'Admin' });
 * ```
 *
 * @example
 * ```typescript
 * // 带默认数据
 * const modal = useModal<User>({
 *   defaultData: {
 *     username: '',
 *     email: '',
 *     enabled: true,
 *   },
 * });
 *
 * // 打开创建弹窗（使用默认数据）
 * modal.openCreate();
 *
 * // 打开创建弹窗（覆盖部分默认数据）
 * modal.openCreate({ username: 'admin' });
 * ```
 *
 * @example
 * ```typescript
 * // 完整示例
 * const {
 *   visible,
 *   mode,
 *   formData,
 *   editId,
 *   isCreate,
 *   isEdit,
 *   openCreate,
 *   openEdit,
 *   close,
 * } = useModal<User>({
 *   defaultData: { username: '', email: '' },
 * });
 *
 * // 在模板中使用
 * <NModal
 *   v-model:show="visible"
 *   :title="isCreate ? '新增用户' : '编辑用户'"
 * >
 *   <NForm :model="formData">
 *     <NFormItem label="用户名">
 *       <NInput v-model:value="formData.username" />
 *     </NFormItem>
 *   </NForm>
 * </NModal>
 * ```
 */
export function useModal<T = any>(options: UseModalOptions<T> = {}) {
  const { defaultData = {} as T } = options;

  /** 显示状态 */
  const visible = ref(false);

  /** 模式：create（创建）| edit（编辑） */
  const mode = ref<'create' | 'edit'>('create');

  /** 表单数据 */
  const formData = ref<T>({ ...defaultData }) as Ref<T>;

  /** 编辑ID（仅编辑模式有值） */
  const editId = ref<number | null>(null);

  /** 是否创建模式 */
  const isCreate = computed(() => mode.value === 'create');

  /** 是否编辑模式 */
  const isEdit = computed(() => mode.value === 'edit');

  /**
   * 打开创建弹窗
   *
   * 设置为创建模式，初始化表单数据，然后显示弹窗。
   * 可以传入部分数据来覆盖默认值。
   *
   * @param data 初始表单数据（可选，部分覆盖默认数据）
   *
   * @example
   * ```typescript
   * // 使用默认数据
   * openCreate();
   * ```
   *
   * @example
   * ```typescript
   * // 覆盖部分默认数据
   * openCreate({ username: 'admin', enabled: true });
   * ```
   */
  function openCreate(data?: Partial<T>) {
    mode.value = 'create';
    editId.value = null;
    formData.value = { ...defaultData, ...data } as T;
    visible.value = true;
  }

  /**
   * 打开编辑弹窗
   *
   * 设置为编辑模式，加载要编辑的数据，然后显示弹窗。
   * 数据必须包含 id 字段。
   *
   * @param data 要编辑的数据（必须包含 id 字段）
   *
   * @example
   * ```typescript
   * // 编辑用户
   * const user = { id: 1, username: 'admin', email: 'admin@example.com' };
   * openEdit(user);
   * ```
   */
  function openEdit(data: T & { id: number }) {
    mode.value = 'edit';
    editId.value = data.id;
    formData.value = { ...data };
    visible.value = true;
  }

  /**
   * 关闭弹窗
   *
   * 隐藏弹窗，延迟 300ms 后重置模式和数据。
   * 延迟是为了等待弹窗关闭动画完成。
   *
   * @example
   * ```typescript
   * // 提交成功后关闭弹窗
   * async function handleSubmit() {
   *   await createUserApi(formData.value);
   *   close();
   * }
   * ```
   */
  function close() {
    visible.value = false;
    setTimeout(() => {
      mode.value = 'create';
      editId.value = null;
      formData.value = { ...defaultData };
    }, 300);
  }

  /**
   * 重置表单数据
   *
   * 将表单数据重置为默认值，但不关闭弹窗。
   * 常用于表单验证失败后的重置操作。
   *
   * @example
   * ```typescript
   * // 重置表单
   * function handleReset() {
   *   reset();
   * }
   * ```
   */
  function reset() {
    formData.value = { ...defaultData };
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

  return {
    /** 显示状态 */
    visible,
    /** 模式：create | edit */
    mode,
    /** 表单数据 */
    formData,
    /** 编辑ID */
    editId,
    /** 是否创建模式 */
    isCreate,
    /** 是否编辑模式 */
    isEdit,
    /** 打开创建弹窗 */
    openCreate,
    /** 打开编辑弹窗 */
    openEdit,
    /** 关闭弹窗 */
    close,
    /** 重置表单数据 */
    reset,
    /** 设置表单数据 */
    setFormData,
  };
}

/**
 * useModal 配置选项
 */
export interface UseModalOptions<T = any> {
  /** 默认表单数据 */
  defaultData?: T;
}
