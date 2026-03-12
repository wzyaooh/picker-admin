/**
 * 认证相关常量
 */
export const AUTH_CONSTANTS = {
  // 验证码配置
  CAPTCHA_LENGTH: 4,
  CAPTCHA_TTL: 5 * 60, // 5分钟（秒）
  CAPTCHA_FONT_SIZE: 40,
  CAPTCHA_WIDTH: 120,
  CAPTCHA_HEIGHT: 40,

  // Token 配置
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
} as const;
