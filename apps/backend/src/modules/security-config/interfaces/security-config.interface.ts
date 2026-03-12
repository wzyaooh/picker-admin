/**
 * 密码策略配置接口
 */
export interface PasswordPolicyConfig {
  // 密码长度
  minLength: number; // 最小长度 (6-32)
  maxLength: number; // 最大长度 (8-128)

  // 密码复杂度
  requireUppercase: boolean; // 必须包含大写字母
  requireLowercase: boolean; // 必须包含小写字母
  requireNumber: boolean; // 必须包含数字
  requireSpecial: boolean; // 必须包含特殊字符
  specialChars: string; // 特殊字符范围

  // 密码有效期
  expiryEnabled: boolean; // 启用密码过期
  expiryDays: number; // 密码有效天数 (0-365)
  expiryWarningDays: number; // 过期前提醒天数 (0-30)

  // 历史密码
  historyEnabled: boolean; // 启用历史密码检查
  historyCount: number; // 历史密码记录数 (0-10)
  rememberPasswordCount: number; // 记住密码次数 (用于历史密码检查)
}

/**
 * 账号锁定配置接口
 */
export interface AccountLockoutConfig {
  // 登录失败锁定
  enabled: boolean; // 启用账号锁定，默认 true
  maxAttempts: number; // 最大登录失败次数 (3-10)，默认 5
  lockoutDuration: number; // 账号锁定时长（分钟）(5-1440)，默认 30

  // Redis 键配置
  redisKeyPrefix: string; // Redis 键前缀，默认 'login_fail:'

  // 可选：持久化到数据库
  persistToDb: boolean; // 是否持久化到数据库，默认 false
}

/**
 * 审计日志配置接口
 */
export interface AuditConfig {
  // 日志记录
  enabled: boolean; // 启用审计日志，默认 true
  saveReqBody: boolean; // 记录请求体，默认 false
  saveResBody: boolean; // 记录响应体，默认 false
  ignorePaths: string[]; // 忽略路径列表

  // 敏感信息脱敏
  maskingEnabled: boolean; // 启用敏感信息脱敏，默认 true
  sensitiveFields: string[]; // 敏感字段列表

  // 日志保留（可选）
  retentionDays: number; // 日志保留天数 (7-365)，默认 90
  autoCleanup: boolean; // 自动清理，默认 true
}

/**
 * 邮件配置接口
 */
export interface EmailConfig {
  protocol: string; // 邮件协议 (SMTP/IMAP/POP3)
  host: string; // 服务器地址
  port: number; // 服务器端口
  username: string; // 邮箱账号
  password: string; // 邮箱密码/授权码
  useSsl: boolean; // 启用SSL加密
  sslPort: number; // SSL端口号
}

/**
 * 安全配置（所有配置的集合）
 */
export interface SecurityConfig {
  passwordPolicy: PasswordPolicyConfig;
  accountLockout: AccountLockoutConfig;
  auditPolicy: AuditConfig;
}

/**
 * 更新安全配置的类型（支持部分更新）
 */
export interface UpdateSecurityConfig {
  passwordPolicy?: Partial<PasswordPolicyConfig>;
  accountLockout?: Partial<AccountLockoutConfig>;
  auditPolicy?: Partial<AuditConfig>;
}
