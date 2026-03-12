import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================
export namespace SecurityConfigApi {
  /** 密码策略配置 */
  export interface PasswordPolicy {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
    specialChars: string;
    expiryEnabled: boolean;
    expiryDays: number;
    expiryWarningDays: number;
    historyEnabled: boolean;
    historyCount: number;
  }

  /** 账号锁定配置 */
  export interface AccountLockout {
    enabled: boolean;
    maxAttempts: number;
    lockoutDuration: number;
    redisKeyPrefix: string;
    persistToDb: boolean;
  }

  /** 审计配置 */
  export interface AuditPolicy {
    enabled: boolean;
    saveReqBody: boolean;
    saveResBody: boolean;
    ignorePaths: string[];
    maskingEnabled: boolean;
    sensitiveFields: string[];
    retentionDays: number;
    autoCleanup: boolean;
  }

  /** 后端返回的安全配置（嵌套结构） */
  export interface SecurityConfigResponse {
    passwordPolicy: PasswordPolicy;
    accountLockout: AccountLockout;
    auditPolicy: AuditPolicy;
  }

  /** 前端使用的安全配置（扁平结构） */
  export interface SecurityConfig {
    // 密码策略
    passwordMinLength: number;
    passwordMaxLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumber: boolean;
    passwordRequireSpecial: boolean;

    // 账号锁定
    maxLoginAttempts: number;
    lockoutDuration: number;
    lockoutEnabled: boolean;

    // 密码有效期
    passwordExpireDays: number;
    passwordExpiryEnabled: boolean;
    passwordExpiryWarningDays: number;

    // 历史密码
    passwordHistoryCount: number;
    passwordHistoryEnabled: boolean;

    // 审计日志
    auditEnabled: boolean;
    auditSaveReqBody: boolean;
    auditRetentionDays: number;
    auditAutoCleanup: boolean;
  }

  /** 更新安全配置参数 */
  export interface UpdateParams {
    passwordPolicy?: Partial<PasswordPolicy>;
    accountLockout?: Partial<AccountLockout>;
    auditPolicy?: Partial<AuditPolicy>;
  }
}

// ==================== 数据转换函数 ====================

/**
 * 将后端嵌套结构转换为前端扁平结构
 */
function transformToFlatConfig(
  response: SecurityConfigApi.SecurityConfigResponse,
): SecurityConfigApi.SecurityConfig {
  return {
    // 密码策略
    passwordMinLength: response.passwordPolicy.minLength,
    passwordMaxLength: response.passwordPolicy.maxLength,
    passwordRequireUppercase: response.passwordPolicy.requireUppercase,
    passwordRequireLowercase: response.passwordPolicy.requireLowercase,
    passwordRequireNumber: response.passwordPolicy.requireNumber,
    passwordRequireSpecial: response.passwordPolicy.requireSpecial,

    // 账号锁定
    maxLoginAttempts: response.accountLockout.maxAttempts,
    lockoutDuration: response.accountLockout.lockoutDuration,
    lockoutEnabled: response.accountLockout.enabled,

    // 密码有效期
    passwordExpireDays: response.passwordPolicy.expiryDays,
    passwordExpiryEnabled: response.passwordPolicy.expiryEnabled,
    passwordExpiryWarningDays: response.passwordPolicy.expiryWarningDays,

    // 历史密码
    passwordHistoryCount: response.passwordPolicy.historyCount,
    passwordHistoryEnabled: response.passwordPolicy.historyEnabled,

    // 审计日志
    auditEnabled: response.auditPolicy.enabled,
    auditSaveReqBody: response.auditPolicy.saveReqBody,
    auditRetentionDays: response.auditPolicy.retentionDays,
    auditAutoCleanup: response.auditPolicy.autoCleanup,
  };
}

/**
 * 将前端扁平结构转换为后端嵌套结构
 */
function transformToNestedConfig(
  config: SecurityConfigApi.SecurityConfig,
): SecurityConfigApi.UpdateParams {
  return {
    passwordPolicy: {
      minLength: config.passwordMinLength,
      maxLength: config.passwordMaxLength,
      requireUppercase: config.passwordRequireUppercase,
      requireLowercase: config.passwordRequireLowercase,
      requireNumber: config.passwordRequireNumber,
      requireSpecial: config.passwordRequireSpecial,
      expiryEnabled: config.passwordExpiryEnabled,
      expiryDays: config.passwordExpireDays,
      expiryWarningDays: config.passwordExpiryWarningDays,
      historyEnabled: config.passwordHistoryEnabled,
      historyCount: config.passwordHistoryCount,
    },
    accountLockout: {
      enabled: config.lockoutEnabled,
      maxAttempts: config.maxLoginAttempts,
      lockoutDuration: config.lockoutDuration,
    },
    auditPolicy: {
      enabled: config.auditEnabled,
      saveReqBody: config.auditSaveReqBody,
      retentionDays: config.auditRetentionDays,
      autoCleanup: config.auditAutoCleanup,
    },
  };
}

// ==================== API 函数 ====================

/**
 * 获取安全配置
 */
export async function getSecurityConfigApi(): Promise<SecurityConfigApi.SecurityConfig> {
  const response =
    await requestClient.get<SecurityConfigApi.SecurityConfigResponse>(
      '/security-config',
    );
  return transformToFlatConfig(response);
}

/**
 * 更新安全配置
 * @param data 更新数据
 */
export async function updateSecurityConfigApi(
  data: SecurityConfigApi.SecurityConfig,
): Promise<SecurityConfigApi.SecurityConfig> {
  const updateParams = transformToNestedConfig(data);
  const response =
    await requestClient.patch<SecurityConfigApi.SecurityConfigResponse>(
      '/security-config',
      updateParams,
    );
  return transformToFlatConfig(response);
}

/**
 * 重置安全配置为默认值
 */
export async function resetSecurityConfigApi(): Promise<SecurityConfigApi.SecurityConfig> {
  const response =
    await requestClient.patch<SecurityConfigApi.SecurityConfigResponse>(
      '/security-config/reset',
    );
  return transformToFlatConfig(response);
}
