import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================
export namespace EmailConfigApi {
  /** 邮件配置 */
  export interface EmailConfig {
    /** 邮件协议 */
    protocol: string;
    /** 服务器地址 */
    host: string;
    /** 服务器端口 */
    port: number;
    /** 邮箱账号 */
    username: string;
    /** 邮箱密码/授权码 */
    password: string;
    /** 启用SSL加密 */
    useSsl: boolean;
    /** SSL端口号 */
    sslPort: number;
  }
}

// ==================== API 函数 ====================

/** 获取邮件配置 */
export async function getEmailConfigApi(): Promise<EmailConfigApi.EmailConfig> {
  return requestClient.get<EmailConfigApi.EmailConfig>(
    '/security-config/email',
  );
}

/** 更新邮件配置 */
export async function updateEmailConfigApi(
  data: Partial<EmailConfigApi.EmailConfig>,
): Promise<EmailConfigApi.EmailConfig> {
  return requestClient.patch<EmailConfigApi.EmailConfig>(
    '/security-config/email',
    data,
  );
}

/** 重置邮件配置为默认值 */
export async function resetEmailConfigApi(): Promise<EmailConfigApi.EmailConfig> {
  return requestClient.patch<EmailConfigApi.EmailConfig>(
    '/security-config/email/reset',
  );
}
