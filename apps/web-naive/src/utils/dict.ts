import type { DictApi } from '#/api/modules/dict';

import { getDictItemsByCodeApi } from '#/api/modules/dict';

/**
 * Select 选项接口
 */
export interface SelectOption {
  label: string;
  value: string;
  color?: string;
  disabled?: boolean;
}

/**
 * 字典缓存
 */
const dictCache = new Map<string, DictApi.DictItem[]>();

/**
 * 获取字典项列表
 * @param code 字典编码
 * @param useCache 是否使用缓存，默认 true
 * @returns 字典项列表
 */
export async function getDictItems(
  code: string,
  useCache = true,
): Promise<DictApi.DictItem[]> {
  // 检查缓存
  if (useCache && dictCache.has(code)) {
    return dictCache.get(code)!;
  }

  try {
    // 从 API 获取
    const items = await getDictItemsByCodeApi(code);

    // 缓存
    if (useCache) {
      dictCache.set(code, items);
    }

    return items;
  } catch (error) {
    console.error(`Failed to load dict items for code: ${code}`, error);
    return [];
  }
}

/**
 * 获取字典项并转换为 Select 选项
 * @param code 字典编码
 * @param useCache 是否使用缓存，默认 true
 * @param includeDisabled 是否包含禁用项，默认 false
 * @returns Select 选项列表
 */
export async function getDictOptions(
  code: string,
  useCache = true,
  includeDisabled = false,
): Promise<SelectOption[]> {
  const items = await getDictItems(code, useCache);

  // 转换为 Select 选项
  return items
    .filter((item) => includeDisabled || item.enable)
    .sort((a, b) => a.sort - b.sort)
    .map((item) => ({
      label: item.label,
      value: item.value,
      color: item.color,
      disabled: !item.enable,
    }));
}

/**
 * 获取字典项标签
 * @param code 字典编码
 * @param value 字典值
 * @param useCache 是否使用缓存，默认 true
 * @returns 字典项标签，如果未找到则返回原值
 */
export async function getDictLabel(
  code: string,
  value: string,
  useCache = true,
): Promise<string> {
  const items = await getDictItems(code, useCache);
  const item = items.find((item) => item.value === value);
  return item?.label || value;
}

/**
 * 获取字典项颜色
 * @param code 字典编码
 * @param value 字典值
 * @param useCache 是否使用缓存，默认 true
 * @returns 字典项颜色，如果未找到则返回 undefined
 */
export async function getDictColor(
  code: string,
  value: string,
  useCache = true,
): Promise<string | undefined> {
  const items = await getDictItems(code, useCache);
  const item = items.find((item) => item.value === value);
  return item?.color;
}

/**
 * 批量获取字典项标签
 * @param code 字典编码
 * @param values 字典值数组
 * @param useCache 是否使用缓存，默认 true
 * @returns 字典项标签数组
 */
export async function getDictLabels(
  code: string,
  values: string[],
  useCache = true,
): Promise<string[]> {
  const items = await getDictItems(code, useCache);
  const itemMap = new Map(items.map((item) => [item.value, item.label]));
  return values.map((value) => itemMap.get(value) || value);
}

/**
 * 清除字典缓存
 * @param code 字典编码，不传则清除所有缓存
 */
export function clearDictCache(code?: string): void {
  if (code) {
    dictCache.delete(code);
  } else {
    dictCache.clear();
  }
}

/**
 * 预加载字典
 * @param codes 字典编码数组
 */
export async function preloadDicts(codes: string[]): Promise<void> {
  await Promise.all(codes.map((code) => getDictItems(code, true)));
}

/**
 * 获取缓存的字典编码列表
 * @returns 已缓存的字典编码数组
 */
export function getCachedDictCodes(): string[] {
  return [...dictCache.keys()];
}

/**
 * 检查字典是否已缓存
 * @param code 字典编码
 * @returns 是否已缓存
 */
export function isDictCached(code: string): boolean {
  return dictCache.has(code);
}

/**
 * 常用字典编码常量
 */
export const DICT_CODES = {
  /** 权限类型 */
  PERMISSION_TYPE: 'PERMISSION_TYPE',
  /** 菜单类型 */
  MENU_TYPE: 'MENU_TYPE',
  /** 用户状态 */
  USER_STATUS: 'USER_STATUS',
  /** 角色状态 */
  ROLE_STATUS: 'ROLE_STATUS',
  /** 启用状态 */
  ENABLE_STATUS: 'ENABLE_STATUS',
  /** HTTP 方法 */
  HTTP_METHOD: 'HTTP_METHOD',
  /** 性别 */
  GENDER: 'GENDER',
  /** 部门类型 */
  DEPARTMENT_TYPE: 'DEPARTMENT_TYPE',
  /** 岗位级别 */
  POSITION_LEVEL: 'POSITION_LEVEL',
  /** 审计操作类型 */
  AUDIT_ACTION: 'AUDIT_ACTION',
  /** 短信厂商 */
  SMS_PROVIDER: 'SMS_PROVIDER',
} as const;
