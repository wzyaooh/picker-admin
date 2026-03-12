import type {
  AccountLockoutConfig,
  AuditConfig,
  EmailConfig,
  PasswordPolicyConfig,
  SecurityConfig,
} from '../interfaces/security-config.interface';

/**
 * 默认密码策略配置
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicyConfig = {
  minLength: 8,
  maxLength: 32,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  expiryEnabled: false,
  expiryDays: 90,
  expiryWarningDays: 7,
  historyEnabled: true,
  historyCount: 3,
  rememberPasswordCount: 3,
};

/**
 * 默认账号锁定配置
 */
export const DEFAULT_ACCOUNT_LOCKOUT: AccountLockoutConfig = {
  enabled: true,
  maxAttempts: 5,
  lockoutDuration: 30,
  redisKeyPrefix: 'login_fail:',
  persistToDb: false,
};

/**
 * 默认审计日志配置
 */
export const DEFAULT_AUDIT_POLICY: AuditConfig = {
  enabled: true,
  saveReqBody: false,
  saveResBody: false,
  ignorePaths: ['/health', '/metrics'],
  maskingEnabled: true,
  sensitiveFields: [
    'password',
    'oldPassword',
    'newPassword',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'secret',
  ],
  retentionDays: 90,
  autoCleanup: true,
};

/**
 * 默认邮件配置
 */
export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  protocol: 'SMTP',
  host: '',
  port: 465,
  username: '',
  password: '',
  useSsl: true,
  sslPort: 465,
};

/**
 * 默认安全配置（所有配置的集合）
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  passwordPolicy: DEFAULT_PASSWORD_POLICY,
  accountLockout: DEFAULT_ACCOUNT_LOCKOUT,
  auditPolicy: DEFAULT_AUDIT_POLICY,
};
