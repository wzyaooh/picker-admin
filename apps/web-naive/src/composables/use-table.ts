import { ref, reactive } from 'vue';
import type { Ref } from 'vue';

/**
 * 表格管理 Composable
 *
 * 提供表格数据的加载、分页、筛选、排序等功能。
 * 支持自动加载、手动刷新、分页切换等操作。
 *
 * 功能特性：
 * - 自动/手动数据加载
 * - 分页管理（页码、页大小）
 * - 查询参数管理
 * - 加载状态管理
 * - 错误处理
 *
 * @template T 数据项类型
 * @template P 查询参数类型
 * @param fetchFn 数据获取函数，接收查询参数，返回分页结果
 * @param options 配置选项
 * @returns 表格相关的状态和方法
 *
 * @example
 * ```typescript
 * // 基本使用
 * const { loading, dataSource, pagination, fetchData, refresh } = useTable(
 *   getUserListApi,
 *   { immediate: true, pageSize: 20 }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // 带查询参数
 * const { loading, dataSource, updateParams } = useTable(
 *   getUserListApi,
 *   {
 *     immediate: true,
 *     defaultParams: { status: 'active' }
 *   }
 * );
 *
 * // 更新查询参数
 * function handleSearch(keyword: string) {
 *   updateParams({ keyword });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 完整示例
 * const {
 *   loading,
 *   dataSource,
 *   pagination,
 *   refresh,
 *   handlePageChange,
 *   handlePageSizeChange,
 * } = useTable<User>(getUserListApi, { immediate: true });
 *
 * // 在模板中使用
 * <NDataTable
 *   :loading="loading"
 *   :data="dataSource"
 *   :pagination="pagination"
 *   @update:page="handlePageChange"
 *   @update:page-size="handlePageSizeChange"
 * />
 * ```
 */
export function useTable<T, P = any>(
  fetchFn: (params: P) => Promise<{ pageData: T[]; total: number }>,
  options: UseTableOptions<P> = {}
) {
  const {
    immediate = false,
    pageSize = 10,
    defaultParams = {} as P,
  } = options;

  /** 加载状态 */
  const loading = ref(false);

  /** 数据源 */
  const dataSource = ref<T[]>([]) as Ref<T[]>;

  /** 分页信息 */
  const pagination = reactive({
    /** 当前页码 */
    page: 1,
    /** 每页数量 */
    pageSize,
    /** 总记录数 */
    total: 0,
  });

  /** 查询参数 */
  const queryParams = ref<P>(defaultParams);

  /**
   * 加载数据
   *
   * 从后端 API 获取表格数据，自动处理分页参数。
   * 加载过程中显示加载状态，失败时清空数据并在控制台输出错误。
   *
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * // 手动加载数据
   * await fetchData();
   * ```
   */
  async function fetchData() {
    loading.value = true;
    try {
      const result = await fetchFn({
        ...queryParams.value,
        pageNo: pagination.page,
        pageSize: pagination.pageSize,
      } as P);

      dataSource.value = result.pageData;
      pagination.total = result.total;
    } catch (error) {
      console.error('Failed to fetch data:', error);
      dataSource.value = [];
      pagination.total = 0;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 刷新数据
   *
   * 重置到第一页并重新加载数据。
   * 常用于数据创建、更新、删除后的列表刷新。
   *
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * // 创建用户后刷新列表
   * await createUserApi(userData);
   * await refresh();
   * ```
   */
  async function refresh() {
    pagination.page = 1;
    await fetchData();
  }

  /**
   * 页码变化处理
   *
   * 当用户切换页码时调用，自动加载新页面的数据。
   *
   * @param page 新的页码
   *
   * @example
   * ```typescript
   * // 在分页组件中使用
   * <NPagination
   *   v-model:page="pagination.page"
   *   @update:page="handlePageChange"
   * />
   * ```
   */
  function handlePageChange(page: number) {
    pagination.page = page;
    fetchData();
  }

  /**
   * 页大小变化处理
   *
   * 当用户修改每页显示数量时调用，重置到第一页并重新加载数据。
   *
   * @param pageSize 新的每页数量
   *
   * @example
   * ```typescript
   * // 在分页组件中使用
   * <NPagination
   *   v-model:page-size="pagination.pageSize"
   *   @update:page-size="handlePageSizeChange"
   * />
   * ```
   */
  function handlePageSizeChange(pageSize: number) {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    fetchData();
  }

  /**
   * 更新查询参数
   *
   * 更新查询参数并重置到第一页，然后重新加载数据。
   * 常用于搜索、筛选等场景。
   *
   * @param params 要更新的查询参数（部分更新）
   *
   * @example
   * ```typescript
   * // 搜索用户
   * function handleSearch(keyword: string) {
   *   updateParams({ keyword });
   * }
   * ```
   *
   * @example
   * ```typescript
   * // 筛选状态
   * function handleFilter(status: string) {
   *   updateParams({ status });
   * }
   * ```
   */
  function updateParams(params: Partial<P>) {
    queryParams.value = { ...queryParams.value, ...params };
    pagination.page = 1;
    fetchData();
  }

  /**
   * 重置查询参数
   *
   * 将查询参数重置为默认值，重置到第一页，然后重新加载数据。
   * 常用于清空搜索条件。
   *
   * @example
   * ```typescript
   * // 重置搜索条件
   * function handleReset() {
   *   resetParams();
   * }
   * ```
   */
  function resetParams() {
    queryParams.value = { ...defaultParams };
    pagination.page = 1;
    fetchData();
  }

  // 立即加载
  if (immediate) {
    fetchData();
  }

  return {
    /** 加载状态 */
    loading,
    /** 数据源 */
    dataSource,
    /** 分页信息 */
    pagination,
    /** 查询参数 */
    queryParams,
    /** 加载数据 */
    fetchData,
    /** 刷新数据（重置到第一页） */
    refresh,
    /** 页码变化处理 */
    handlePageChange,
    /** 页大小变化处理 */
    handlePageSizeChange,
    /** 更新查询参数 */
    updateParams,
    /** 重置查询参数 */
    resetParams,
  };
}

/**
 * useTable 配置选项
 */
export interface UseTableOptions<P = any> {
  /** 是否立即加载数据，默认 false */
  immediate?: boolean;
  /** 默认每页数量，默认 10 */
  pageSize?: number;
  /** 默认查询参数，默认空对象 */
  defaultParams?: P;
}
