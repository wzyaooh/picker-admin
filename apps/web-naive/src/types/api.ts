/**
 * API 通用类型定义
 *
 * 定义了 API 请求和响应的通用类型，包括分页、排序、筛选等。
 */

/**
 * 分页查询参数
 *
 * 用于所有分页查询接口的通用参数。
 *
 * @example
 * ```typescript
 * const params: PageParams = {
 *   pageNo: 1,
 *   pageSize: 20,
 * };
 * const result = await getUserListApi(params);
 * ```
 */
export interface PageParams {
  /** 页码，从1开始 */
  pageNo?: number;
  /** 每页数量，默认10 */
  pageSize?: number;
}

/**
 * 分页查询结果
 *
 * 所有分页查询接口的统一返回格式。
 *
 * @template T 数据项类型
 *
 * @example
 * ```typescript
 * const result: PageResult<User> = await getUserListApi(params);
 * console.log(result.pageData); // 用户列表
 * console.log(result.total);    // 总记录数
 * ```
 */
export interface PageResult<T> {
  /** 数据列表 */
  pageData: T[];
  /** 总记录数 */
  total: number;
  /** 当前页码（可选） */
  page?: number;
  /** 每页数量（可选） */
  pageSize?: number;
}

/**
 * 基础实体
 *
 * 所有实体的基类，包含通用字段。
 * 所有数据库实体都应该继承此接口。
 *
 * @example
 * ```typescript
 * interface User extends BaseEntity {
 *   username: string;
 *   email: string;
 * }
 * ```
 */
export interface BaseEntity {
  /** 主键ID */
  id: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * API 响应包装
 *
 * 所有 API 响应的统一格式。
 *
 * @template T 响应数据类型
 *
 * @example
 * ```typescript
 * const response: ApiResponse<User> = {
 *   code: 0,
 *   data: { id: 1, username: 'admin' },
 *   message: 'success',
 * };
 * ```
 */
export interface ApiResponse<T = any> {
  /** 响应码，0表示成功 */
  code: number;
  /** 响应数据 */
  data: T;
  /** 响应消息 */
  message: string;
}

/**
 * 排序参数
 *
 * 用于列表排序的参数。
 *
 * @example
 * ```typescript
 * const params: SortParams = {
 *   sortField: 'createdAt',
 *   sortOrder: 'DESC',
 * };
 * ```
 */
export interface SortParams {
  /** 排序字段 */
  sortField?: string;
  /** 排序方向：ASC（升序）| DESC（降序） */
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * 查询参数
 *
 * 通用的查询参数，包含分页、排序、关键词搜索。
 *
 * @example
 * ```typescript
 * const params: QueryParams = {
 *   pageNo: 1,
 *   pageSize: 20,
 *   keyword: 'admin',
 *   sortField: 'createdAt',
 *   sortOrder: 'DESC',
 * };
 * ```
 */
export interface QueryParams extends PageParams, SortParams {
  /** 搜索关键词 */
  keyword?: string;
}

/**
 * ID 参数
 *
 * 用于根据 ID 查询、更新、删除的参数。
 *
 * @example
 * ```typescript
 * const params: IdParams = { id: 1 };
 * const user = await getUserApi(params.id);
 * ```
 */
export interface IdParams {
  /** 记录ID */
  id: number;
}

/**
 * 批量 ID 参数
 *
 * 用于批量操作的参数。
 *
 * @example
 * ```typescript
 * const params: BatchIdParams = { ids: [1, 2, 3] };
 * await batchDeleteUsersApi(params.ids);
 * ```
 */
export interface BatchIdParams {
  /** 记录ID列表 */
  ids: number[];
}

/**
 * 启用/禁用参数
 *
 * 用于切换记录启用状态的参数。
 *
 * @example
 * ```typescript
 * const params: EnableParams = {
 *   id: 1,
 *   enabled: true,
 * };
 * await updateUserStatusApi(params);
 * ```
 */
export interface EnableParams extends IdParams {
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 树形节点
 *
 * 用于树形结构数据的通用接口。
 *
 * @template T 节点数据类型
 *
 * @example
 * ```typescript
 * interface MenuNode extends TreeNode<Menu> {
 *   // 菜单特有属性
 * }
 * ```
 */
export interface TreeNode<T = any> {
  /** 节点ID */
  id: number;
  /** 父节点ID */
  parentId: number | null;
  /** 节点数据 */
  data?: T;
  /** 子节点列表 */
  children?: TreeNode<T>[];
}

/**
 * 选项
 *
 * 用于下拉选择器的选项。
 *
 * @example
 * ```typescript
 * const options: Option[] = [
 *   { label: '启用', value: '1' },
 *   { label: '禁用', value: '0' },
 * ];
 * ```
 */
export interface Option<T = any> {
  /** 显示文本 */
  label: string;
  /** 选项值 */
  value: T;
  /** 是否禁用 */
  disabled?: boolean;
  /** 额外数据 */
  extra?: any;
}

/**
 * 上传文件信息
 *
 * 文件上传后的返回信息。
 *
 * @example
 * ```typescript
 * const fileInfo: UploadFileInfo = {
 *   id: 1,
 *   name: 'avatar.jpg',
 *   url: 'https://example.com/avatar.jpg',
 *   size: 102400,
 *   type: 'image/jpeg',
 * };
 * ```
 */
export interface UploadFileInfo {
  /** 文件ID */
  id: number;
  /** 文件名 */
  name: string;
  /** 文件URL */
  url: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件类型 */
  type: string;
  /** 上传时间 */
  uploadedAt?: string;
}

/**
 * 统计数据
 *
 * 用于仪表盘等统计数据展示。
 *
 * @example
 * ```typescript
 * const stats: StatisticsData = {
 *   total: 1000,
 *   active: 800,
 *   inactive: 200,
 *   growth: 15.5,
 * };
 * ```
 */
export interface StatisticsData {
  /** 总数 */
  total: number;
  /** 活跃数 */
  active?: number;
  /** 非活跃数 */
  inactive?: number;
  /** 增长率（百分比） */
  growth?: number;
  /** 额外数据 */
  [key: string]: any;
}
