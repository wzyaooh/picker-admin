/**
 * 错误类型定义
 *
 * 定义了应用中使用的所有错误类型，包括 HTTP 错误码、业务错误码和 API 错误信息。
 */

/**
 * HTTP 错误码枚举
 *
 * 定义了常见的 HTTP 状态码，用于识别网络请求错误。
 *
 * @example
 * ```typescript
 * if (error.code === HttpErrorCode.UNAUTHORIZED) {
 *   // 跳转到登录页
 *   router.push('/login');
 * }
 * ```
 */
export enum HttpErrorCode {
  /** 错误请求 - 请求参数错误 */
  BAD_REQUEST = 400,
  /** 未授权 - 未登录或令牌过期 */
  UNAUTHORIZED = 401,
  /** 无权限 - 已登录但无访问权限 */
  FORBIDDEN = 403,
  /** 资源不存在 - 请求的资源未找到 */
  NOT_FOUND = 404,
  /** 请求超时 - 服务器响应超时 */
  TIMEOUT = 408,
  /** 冲突 - 资源冲突（如重复创建） */
  CONFLICT = 409,
  /** 请求实体过大 - 上传文件过大 */
  PAYLOAD_TOO_LARGE = 413,
  /** 请求过多 - 触发限流 */
  TOO_MANY_REQUESTS = 429,
  /** 服务器错误 - 服务器内部错误 */
  SERVER_ERROR = 500,
  /** 网关错误 - 网关或代理错误 */
  BAD_GATEWAY = 502,
  /** 服务不可用 - 服务器维护或过载 */
  SERVICE_UNAVAILABLE = 503,
  /** 网关超时 - 网关或代理超时 */
  GATEWAY_TIMEOUT = 504,
}

/**
 * 业务错误码枚举
 *
 * 定义了应用特定的业务错误码，用于识别业务逻辑错误。
 * 错误码范围：
 * - 10xxx: 通用错误
 * - 11xxx: 权限错误
 * - 20xxx: 业务错误
 * - 30xxx: 数据验证错误
 *
 * @example
 * ```typescript
 * if (error.code === BusinessErrorCode.RECORD_EXISTS) {
 *   message.error('记录已存在');
 * }
 * ```
 */
export enum BusinessErrorCode {
  // 通用错误 10xxx
  /** 参数错误 - 请求参数不符合要求 */
  INVALID_PARAMS = 10001,
  /** 用户不存在 - 指定的用户未找到 */
  USER_NOT_FOUND = 10002,
  /** 操作失败 - 通用操作失败 */
  OPERATION_FAILED = 10003,
  /** 系统繁忙 - 系统负载过高 */
  SYSTEM_BUSY = 10004,

  // 权限错误 11xxx
  /** 无权限访问 - 用户无访问权限 */
  NO_PERMISSION = 11001,
  /** 角色已禁用 - 用户角色被禁用 */
  ROLE_DISABLED = 11002,
  /** 账号已禁用 - 用户账号被禁用 */
  ACCOUNT_DISABLED = 11003,
  /** 令牌无效 - 访问令牌无效或过期 */
  INVALID_TOKEN = 11004,
  /** 令牌过期 - 访问令牌已过期 */
  TOKEN_EXPIRED = 11005,

  // 业务错误 20xxx
  /** 记录已存在 - 创建的记录已存在 */
  RECORD_EXISTS = 20001,
  /** 记录不存在 - 指定的记录未找到 */
  RECORD_NOT_FOUND = 20002,
  /** 记录被引用 - 记录被其他数据引用，无法删除 */
  RECORD_REFERENCED = 20003,
  /** 状态不允许 - 当前状态不允许此操作 */
  INVALID_STATE = 20004,
  /** 数据冲突 - 数据版本冲突 */
  DATA_CONFLICT = 20005,

  // 数据验证错误 30xxx
  /** 用户名格式错误 - 用户名不符合格式要求 */
  INVALID_USERNAME = 30001,
  /** 密码格式错误 - 密码不符合格式要求 */
  INVALID_PASSWORD = 30002,
  /** 邮箱格式错误 - 邮箱地址格式不正确 */
  INVALID_EMAIL = 30003,
  /** 手机号格式错误 - 手机号码格式不正确 */
  INVALID_PHONE = 30004,
  /** 验证码错误 - 验证码不正确或已过期 */
  INVALID_CAPTCHA = 30005,
}

/**
 * API 错误信息
 *
 * 定义了 API 请求错误的标准结构。
 * 所有 API 错误都应该符合这个接口。
 *
 * @example
 * ```typescript
 * try {
 *   await createUserApi(userData);
 * } catch (error) {
 *   const apiError = error as ApiError;
 *   console.error(`错误码: ${apiError.code}`);
 *   console.error(`错误消息: ${apiError.message}`);
 *   if (apiError.details) {
 *     console.error('错误详情:', apiError.details);
 *   }
 * }
 * ```
 */
export interface ApiError {
  /** 错误码（HTTP 状态码或业务错误码） */
  code: number;
  /** 错误消息（用户可读的错误描述） */
  message: string;
  /** 错误详情（可选，包含更多错误信息） */
  details?: any;
  /** 错误堆栈（可选，仅开发环境） */
  stack?: string;
  /** 请求路径（可选） */
  path?: string;
  /** 时间戳（可选） */
  timestamp?: string;
}

/**
 * 错误消息映射
 *
 * 将错误码映射为用户友好的错误消息。
 * 用于在 UI 中显示更友好的错误提示。
 *
 * @example
 * ```typescript
 * const message = ERROR_MESSAGES[error.code] || error.message;
 * notification.error({ message });
 * ```
 */
export const ERROR_MESSAGES: Record<number, string> = {
  // HTTP 错误
  [HttpErrorCode.BAD_REQUEST]: '请求参数错误',
  [HttpErrorCode.UNAUTHORIZED]: '未登录或登录已过期，请重新登录',
  [HttpErrorCode.FORBIDDEN]: '无权限访问此资源',
  [HttpErrorCode.NOT_FOUND]: '请求的资源不存在',
  [HttpErrorCode.TIMEOUT]: '请求超时，请稍后重试',
  [HttpErrorCode.CONFLICT]: '资源冲突，请刷新后重试',
  [HttpErrorCode.PAYLOAD_TOO_LARGE]: '上传文件过大',
  [HttpErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后重试',
  [HttpErrorCode.SERVER_ERROR]: '服务器错误，请稍后重试',
  [HttpErrorCode.BAD_GATEWAY]: '网关错误，请稍后重试',
  [HttpErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',
  [HttpErrorCode.GATEWAY_TIMEOUT]: '网关超时，请稍后重试',

  // 通用错误
  [BusinessErrorCode.INVALID_PARAMS]: '参数错误',
  [BusinessErrorCode.USER_NOT_FOUND]: '用户不存在',
  [BusinessErrorCode.OPERATION_FAILED]: '操作失败',
  [BusinessErrorCode.SYSTEM_BUSY]: '系统繁忙，请稍后重试',

  // 权限错误
  [BusinessErrorCode.NO_PERMISSION]: '无权限访问',
  [BusinessErrorCode.ROLE_DISABLED]: '角色已被禁用',
  [BusinessErrorCode.ACCOUNT_DISABLED]: '账号已被禁用',
  [BusinessErrorCode.INVALID_TOKEN]: '令牌无效',
  [BusinessErrorCode.TOKEN_EXPIRED]: '令牌已过期',

  // 业务错误
  [BusinessErrorCode.RECORD_EXISTS]: '记录已存在',
  [BusinessErrorCode.RECORD_NOT_FOUND]: '记录不存在',
  [BusinessErrorCode.RECORD_REFERENCED]: '记录被引用，无法删除',
  [BusinessErrorCode.INVALID_STATE]: '当前状态不允许此操作',
  [BusinessErrorCode.DATA_CONFLICT]: '数据冲突，请刷新后重试',

  // 数据验证错误
  [BusinessErrorCode.INVALID_USERNAME]: '用户名格式错误',
  [BusinessErrorCode.INVALID_PASSWORD]: '密码格式错误',
  [BusinessErrorCode.INVALID_EMAIL]: '邮箱格式错误',
  [BusinessErrorCode.INVALID_PHONE]: '手机号格式错误',
  [BusinessErrorCode.INVALID_CAPTCHA]: '验证码错误',
};

/**
 * 获取错误消息
 *
 * 根据错误码获取用户友好的错误消息。
 * 如果错误码没有对应的消息，返回默认消息或原始错误消息。
 *
 * @param error API 错误对象
 * @param defaultMessage 默认错误消息（可选）
 * @returns 用户友好的错误消息
 *
 * @example
 * ```typescript
 * try {
 *   await createUserApi(userData);
 * } catch (error) {
 *   const message = getErrorMessage(error as ApiError);
 *   notification.error({ message });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 使用自定义默认消息
 * const message = getErrorMessage(error as ApiError, '操作失败，请重试');
 * ```
 */
export function getErrorMessage(
  error: ApiError,
  defaultMessage = '操作失败，请稍后重试'
): string {
  return ERROR_MESSAGES[error.code] || error.message || defaultMessage;
}

/**
 * 判断是否为 HTTP 错误
 *
 * @param code 错误码
 * @returns 是否为 HTTP 错误
 *
 * @example
 * ```typescript
 * if (isHttpError(error.code)) {
 *   console.log('这是一个 HTTP 错误');
 * }
 * ```
 */
export function isHttpError(code: number): boolean {
  return code >= 400 && code < 600;
}

/**
 * 判断是否为业务错误
 *
 * @param code 错误码
 * @returns 是否为业务错误
 *
 * @example
 * ```typescript
 * if (isBusinessError(error.code)) {
 *   console.log('这是一个业务错误');
 * }
 * ```
 */
export function isBusinessError(code: number): boolean {
  return code >= 10000 && code < 40000;
}

/**
 * 判断是否需要重新登录
 *
 * @param code 错误码
 * @returns 是否需要重新登录
 *
 * @example
 * ```typescript
 * if (isAuthError(error.code)) {
 *   router.push('/login');
 * }
 * ```
 */
export function isAuthError(code: number): boolean {
  return (
    code === HttpErrorCode.UNAUTHORIZED ||
    code === BusinessErrorCode.INVALID_TOKEN ||
    code === BusinessErrorCode.TOKEN_EXPIRED
  );
}
