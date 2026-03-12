/**
 * 用户相关常量
 */
export const USER_CONSTANTS = {
  // 根用户 ID（不可删除）
  ROOT_USER_ID: 1,

  // 默认头像
  DEFAULT_AVATAR: 'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif',

  // 密码规则
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 20,
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,

  // 用户名规则
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,

  // 登录失败限制
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCK_DURATION: 30 * 60, // 30分钟（秒）
} as const;
