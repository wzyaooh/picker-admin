import { baseRequestClient, requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/**
 * 认证相关 API 类型定义
 */
export namespace AuthApi {
  /**
   * 登录请求参数
   */
  export interface LoginParams {
    /** 用户名（1-50字符） */
    username?: string;
    /** 密码（6-20字符） */
    password?: string;
    /** 验证码（4位数字或字母） */
    captcha?: string;
    /** 验证码ID */
    captchaId?: string;
    /** 是否快速登录（跳过验证码） */
    isQuick?: boolean;
  }

  /**
   * 登录响应结果
   */
  export interface LoginResult {
    /** 访问令牌（JWT） */
    accessToken: string;
    /** 是否必须修改密码（密码已过期） */
    mustChangePassword?: boolean;
    /** 密码过期提醒（密码即将过期时返回） */
    passwordExpiryWarning?: {
      /** 距离过期的剩余天数 */
      remainingDays: number;
    };
  }

  /**
   * 刷新令牌响应结果
   */
  export interface RefreshTokenResult {
    /** 新的访问令牌 */
    data: string;
    /** HTTP 状态码 */
    status: number;
  }

  /**
   * 注册请求参数
   */
  export interface RegisterParams {
    /** 用户名（必填，1-50字符） */
    username: string;
    /** 密码（必填，6-20字符） */
    password: string;
    /** 邮箱（可选，需符合邮箱格式） */
    email?: string;
    /** 手机号（可选，需符合手机号格式） */
    phone?: string;
  }

  /**
   * 验证码响应结果
   */
  export interface CaptchaResult {
    /** 验证码ID，用于验证时提交 */
    captchaId: string;
    /** 验证码 SVG 图片（Base64 编码） */
    svg: string;
  }

  /**
   * 验证码响应（兼容旧字段名）
   * @deprecated 使用 CaptchaResult 代替
   */
  export interface CaptchaResponse {
    /** 验证码ID */
    captchaId: string;
    /** 验证码 SVG 图片 */
    svg: string;
  }

  /**
   * 修改密码请求参数
   */
  export interface ChangePasswordParams {
    /** 旧密码（必填，6-20字符） */
    oldPassword: string;
    /** 新密码（必填，6-20字符） */
    newPassword: string;
  }

  /**
   * 环境信息
   */
  export interface EnvironmentInfo {
    /** 是否为预览环境 */
    isPreview: boolean;
    /** 环境名称（development/production/test） */
    environment: string;
    /** 应用版本号 */
    version: string;
  }

  /**
   * 公开密码策略配置（无需认证即可获取）
   */
  export interface PublicPasswordPolicy {
    /** 密码最小长度 */
    minLength: number;
    /** 密码最大长度 */
    maxLength: number;
    /** 是否要求包含大写字母 */
    requireUppercase: boolean;
    /** 是否要求包含小写字母 */
    requireLowercase: boolean;
    /** 是否要求包含数字 */
    requireNumber: boolean;
    /** 是否要求包含特殊字符 */
    requireSpecial: boolean;
  }
}

// ==================== API 函数 ====================

/**
 * 用户登录
 *
 * 使用用户名和密码进行登录认证，成功后返回访问令牌（JWT）。
 * 访问令牌会自动存储在 Cookie 中，用于后续 API 调用的身份验证。
 * 如果启用了验证码功能，需要先调用 getCaptchaApi 获取验证码。
 *
 * @param data 登录参数
 * @param data.username 用户名（必填，1-50字符）
 * @param data.password 密码（必填，6-20字符）
 * @param data.captcha 验证码（可选，4位数字或字母）
 * @param data.captchaId 验证码ID（可选，与验证码配对使用）
 * @param data.isQuick 是否快速登录（可选，跳过验证码验证）
 * @returns 登录结果，包含访问令牌
 * @throws {Error} 当用户名或密码错误时抛出错误
 * @throws {Error} 当验证码错误或过期时抛出错误
 * @throws {Error} 当账号被禁用时抛出错误
 *
 * @example
 * ```typescript
 * // 基本登录
 * const result = await loginApi({
 *   username: 'admin',
 *   password: '123456'
 * });
 * console.log(result.accessToken);
 * ```
 *
 * @example
 * ```typescript
 * // 带验证码登录
 * const captcha = await getCaptchaApi();
 * const result = await loginApi({
 *   username: 'admin',
 *   password: '123456',
 *   captcha: '1234',
 *   captchaId: captcha.captchaId
 * });
 * ```
 */
export async function loginApi(
  data: AuthApi.LoginParams,
): Promise<AuthApi.LoginResult> {
  return requestClient.post<AuthApi.LoginResult>('/auth/login', data);
}

/**
 * 用户注册
 *
 * 创建新用户账号，需要提供用户名和密码。
 * 用户名必须唯一，密码需要符合安全要求（6-20字符）。
 * 注册成功后，用户可以使用用户名和密码登录系统。
 *
 * @param data 注册参数
 * @param data.username 用户名（必填，1-50字符，必须唯一）
 * @param data.password 密码（必填，6-20字符）
 * @param data.email 邮箱（可选，需符合邮箱格式）
 * @param data.phone 手机号（可选，需符合手机号格式）
 * @returns 注册是否成功
 * @throws {Error} 当用户名已存在时抛出错误
 * @throws {Error} 当邮箱格式不正确时抛出错误
 * @throws {Error} 当手机号格式不正确时抛出错误
 *
 * @example
 * ```typescript
 * // 基本注册
 * const success = await registerApi({
 *   username: 'newuser',
 *   password: '123456'
 * });
 * ```
 *
 * @example
 * ```typescript
 * // 完整注册信息
 * const success = await registerApi({
 *   username: 'newuser',
 *   password: '123456',
 *   email: 'user@example.com',
 *   phone: '13800138000'
 * });
 * ```
 */
export async function registerApi(
  data: AuthApi.RegisterParams,
): Promise<boolean> {
  return requestClient.post<boolean>('/auth/register', data);
}

/**
 * 刷新访问令牌
 *
 * 使用刷新令牌（Refresh Token）获取新的访问令牌。
 * 当访问令牌过期时，可以调用此接口获取新的访问令牌，无需重新登录。
 * 刷新令牌存储在 HttpOnly Cookie 中，会自动随请求发送。
 *
 * @returns 新的访问令牌和 HTTP 状态码
 * @throws {Error} 当刷新令牌无效或过期时抛出错误
 * @throws {Error} 当用户账号被禁用时抛出错误
 *
 * @example
 * ```typescript
 * // 刷新令牌
 * const result = await refreshTokenApi();
 * console.log(result.data); // 新的访问令牌
 * ```
 */
export async function refreshTokenApi(): Promise<AuthApi.RefreshTokenResult> {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>(
    '/auth/refresh/token',
    {
      withCredentials: true,
    },
  );
}

/**
 * 用户登出
 *
 * 退出当前登录状态，清除服务器端的会话信息。
 * 登出后，访问令牌和刷新令牌都会失效，需要重新登录才能访问受保护的资源。
 * 前端应该在调用此接口后清除本地存储的用户信息和令牌。
 *
 * @returns 登出是否成功
 * @throws {Error} 当用户未登录时抛出错误
 *
 * @example
 * ```typescript
 * // 用户登出
 * const success = await logoutApi();
 * if (success) {
 *   // 清除本地用户信息
 *   localStorage.removeItem('userInfo');
 *   // 跳转到登录页
 *   router.push('/login');
 * }
 * ```
 */
export async function logoutApi(): Promise<boolean> {
  return requestClient.post<boolean>('/auth/logout');
}

/**
 * 获取验证码
 *
 * 获取图形验证码，用于登录时的安全验证。
 * 返回的验证码为 SVG 格式的图片（Base64 编码），可以直接在 img 标签中显示。
 * 验证码有效期为 5 分钟，过期后需要重新获取。
 *
 * @returns 验证码ID和SVG图片
 * @throws {Error} 当服务器生成验证码失败时抛出错误
 *
 * @example
 * ```typescript
 * // 获取验证码
 * const captcha = await getCaptchaApi();
 *
 * // 在模板中显示验证码
 * <img :src="captcha.svg" alt="验证码" />
 *
 * // 登录时提交验证码
 * await loginApi({
 *   username: 'admin',
 *   password: '123456',
 *   captcha: userInputCaptcha,
 *   captchaId: captcha.captchaId
 * });
 * ```
 */
export async function getCaptchaApi(): Promise<AuthApi.CaptchaResult> {
  return requestClient.get<AuthApi.CaptchaResult>('/auth/captcha');
}

/**
 * 修改密码
 *
 * 修改当前登录用户的密码。
 * 需要提供旧密码进行验证，确保是用户本人操作。
 * 新密码需要符合安全要求（6-20字符），建议包含字母、数字和特殊字符。
 * 修改成功后，用户需要使用新密码重新登录。
 *
 * @param data 密码参数
 * @param data.oldPassword 旧密码（必填，6-20字符）
 * @param data.newPassword 新密码（必填，6-20字符）
 * @returns 修改是否成功
 * @throws {Error} 当旧密码错误时抛出错误
 * @throws {Error} 当新密码格式不正确时抛出错误
 * @throws {Error} 当新密码与旧密码相同时抛出错误
 *
 * @example
 * ```typescript
 * // 修改密码
 * const success = await changePasswordApi({
 *   oldPassword: '123456',
 *   newPassword: 'newPassword123'
 * });
 *
 * if (success) {
 *   message.success('密码修改成功，请重新登录');
 *   // 跳转到登录页
 *   router.push('/login');
 * }
 * ```
 */
export async function changePasswordApi(
  data: AuthApi.ChangePasswordParams,
): Promise<boolean> {
  return requestClient.post<boolean>('/auth/password', data);
}

/**
 * 切换当前角色
 *
 * 切换当前用户的活动角色。
 * 用户可能拥有多个角色，通过此接口可以切换到不同的角色，获得不同的权限。
 * 切换角色后，用户的权限会立即更新，无需重新登录。
 *
 * @param roleCode 角色代码（如：ADMIN、USER、MANAGER）
 * @returns 切换是否成功
 * @throws {Error} 当角色代码不存在时抛出错误
 * @throws {Error} 当用户没有该角色时抛出错误
 *
 * @example
 * ```typescript
 * // 切换到管理员角色
 * const success = await switchRoleApi('ADMIN');
 * if (success) {
 *   message.success('已切换到管理员角色');
 *   // 刷新权限
 *   await loadUserPermissions();
 * }
 * ```
 */
export async function switchRoleApi(roleCode: string): Promise<boolean> {
  return requestClient.post<boolean>(`/auth/current-role/switch/${roleCode}`);
}

/**
 * 获取用户权限码
 *
 * 获取当前登录用户的所有权限码列表。
 * 权限码用于前端权限控制，判断用户是否有权限访问某个功能或页面。
 * 权限码格式通常为：模块:操作，如：user:create、role:edit、permission:delete。
 *
 * @returns 权限码数组
 * @throws {Error} 当用户未登录时抛出错误
 *
 * @example
 * ```typescript
 * // 获取权限码
 * const codes = await getAccessCodesApi();
 * console.log(codes); // ['user:create', 'user:edit', 'role:view', ...]
 *
 * // 检查权限
 * const hasPermission = codes.includes('user:create');
 * if (hasPermission) {
 *   // 显示创建用户按钮
 * }
 * ```
 */
export async function getAccessCodesApi(): Promise<string[]> {
  return requestClient.get<string[]>('/auth/codes');
}

/**
 * 获取环境信息
 *
 * 获取当前应用的环境信息，包括是否为预览环境、环境名称和版本号。
 * 此接口无需认证，可以在登录前调用，用于前端判断当前运行环境。
 * 预览环境通常用于演示和测试，可能会有一些功能限制。
 *
 * @returns 环境信息
 *
 * @example
 * ```typescript
 * // 获取环境信息
 * const env = await getEnvironmentApi();
 * console.log(env.environment); // 'production' | 'development' | 'test'
 * console.log(env.version); // '1.0.0'
 *
 * // 根据环境显示不同的提示
 * if (env.isPreview) {
 *   message.info('当前为预览环境，部分功能受限');
 * }
 * ```
 */
export async function getEnvironmentApi(): Promise<AuthApi.EnvironmentInfo> {
  return requestClient.get<AuthApi.EnvironmentInfo>('/health/env');
}

/**
 * 获取密码策略（公开接口）
 *
 * 获取当前系统的密码策略配置，用于前端注册页面展示密码要求。
 * 此接口无需认证，可以在未登录状态下调用。
 * 仅返回密码复杂度相关字段，不包含过期策略等内部管理字段。
 *
 * @returns 密码策略配置
 *
 * @example
 * ```typescript
 * const policy = await getPasswordPolicyApi();
 * console.log(policy.minLength); // 8
 * console.log(policy.requireUppercase); // true
 * ```
 */
export async function getPasswordPolicyApi(): Promise<AuthApi.PublicPasswordPolicy> {
  return requestClient.get<AuthApi.PublicPasswordPolicy>(
    '/auth/password-policy',
  );
}
