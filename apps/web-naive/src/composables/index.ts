/**
 * Composables 统一导出
 *
 * 集中管理所有 Composables，方便导入使用。
 *
 * @example
 * ```typescript
 * // 导入单个 Composable
 * import { useTable } from '@/composables';
 *
 * // 导入多个 Composables
 * import { useTable, useModal, useForm } from '@/composables';
 * ```
 */

// 表格管理
export { useTable } from './use-table';
export type { UseTableOptions } from './use-table';

// 弹窗管理
export { useModal } from './use-modal';
export type { UseModalOptions } from './use-modal';

// 表单管理
export { useForm } from './use-form';
export type { UseFormOptions } from './use-form';

// 权限检查
export { usePermission } from './use-permission';

// 字典管理
export { useDict } from './use-dict';

// 密码强度
export { usePasswordStrength } from './use-password-strength';
export type { PasswordStrengthLevel, PasswordStrengthInfo } from './use-password-strength';
