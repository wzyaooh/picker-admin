import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcryptjs';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { ACCESS_TOKEN_EXPIRATION_TIME, AUTH_CONSTANTS, USER_ACCESS_TOKEN_KEY } from '@/constants';
import { UserService } from '@/modules/user/user.service';
import { RedisService } from '@/shared/redis.service';
import { SecurityConfigService } from '@/modules/security-config/security-config.service';

/**
 * 认证服务
 * 提供用户登录、登出、令牌生成、验证码等功能
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly securityConfigService: SecurityConfigService,
  ) {}

  /**
   * 验证用户凭证
   * @param username 用户名
   * @param password 密码
   * @returns 验证成功返回用户信息（不含密码），失败返回 null
   */
  async validateUser(username: string, password: string) {
    // 1. 从配置读取账号锁定策略
    const policy = await this.securityConfigService.getAccountLockoutPolicy();

    if (!policy.enabled) {
      // 锁定功能未启用，直接验证
      return this.doValidate(username, password);
    }

    // 2. 检查账号是否被锁定
    const failKey = `${policy.redisKeyPrefix}${username}`;
    const failCountStr = await this.redisService.get(failKey);
    const failCount = parseInt(failCountStr || '0', 10);

    if (failCount >= policy.maxAttempts) {
      // 获取剩余锁定时间
      const ttl = await this.redisService.ttl(failKey);
      const remainingMinutes = Math.ceil(ttl / 60);
      
      throw new CustomException(
        ErrorCode.ERR_10401,
        `账号已被锁定，请 ${remainingMinutes} 分钟后重试`,
      );
    }

    // 3. 验证密码
    const user = await this.userService.findByUsername(username);

    if (!user) {
      // 用户不存在，记录失败次数（防止暴力破解）
      await this.recordLoginFailure(failKey, failCount, policy);
      return null;
    }

    if (!user.enable) {
      throw new CustomException(ErrorCode.ERR_10002, '账号已被禁用');
    }

    if (compareSync(password, user.password)) {
      // 验证成功，清除失败记录
      await this.redisService.del(failKey);
      const { password: _, ...result } = user;
      return result;
    }

    // 4. 密码错误，记录失败次数
    await this.recordLoginFailure(failKey, failCount, policy);

    // 5. 检查是否达到锁定阈值
    const newFailCount = failCount + 1;
    if (newFailCount >= policy.maxAttempts) {
      throw new CustomException(
        ErrorCode.ERR_10401,
        `登录失败次数过多，账号已被锁定 ${policy.lockoutDuration} 分钟`,
      );
    }

    // 6. 提示剩余尝试次数
    const remainingAttempts = policy.maxAttempts - newFailCount;
    throw new CustomException(
      ErrorCode.ERR_10004,
      `密码错误，还可以尝试 ${remainingAttempts} 次`,
    );
  }

  /**
   * 记录登录失败
   * @param failKey Redis 键
   * @param currentCount 当前失败次数
   * @param policy 账号锁定策略
   */
  private async recordLoginFailure(
    failKey: string,
    currentCount: number,
    policy: any,
  ): Promise<void> {
    const newCount = currentCount + 1;
    const ttl = policy.lockoutDuration * 60; // 转换为秒
    await this.redisService.set(failKey, newCount.toString(), ttl);
  }

  /**
   * 执行用户验证（内部方法）
   */
  private async doValidate(username: string, password: string) {
    const user = await this.userService.findByUsername(username);

    if (user && compareSync(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  /**
   * 用户登录
   * @param user 用户信息
   * @param ipAddress 登录IP地址
   * @returns 访问令牌
   */
  async login(user: any, ipAddress?: string) {
    if (!user.roles?.some((item: any) => item.enable)) {
      throw new CustomException(ErrorCode.ERR_11003);
    }
    
    // 更新最后登录时间和IP
    if (user.id) {
      await this.userService.updateLoginInfo(user.id, ipAddress);
    }
    
    const roleCodes = user.roles?.map((item: any) => item.code);
    const currentRole = user.roles[0];
    const payload = {
      userId: user.id,
      username: user.username,
      roleCodes,
      currentRoleCode: currentRole.code,
    };
    
    const tokenResult = this.generateToken(payload);

    // 检查密码过期状态
    let mustChangePassword = false;
    let passwordExpiryWarning: { remainingDays: number } | undefined;

    try {
      const passwordPolicy = await this.securityConfigService.getPasswordPolicy();
      const expiryResult = checkPasswordExpiry(
        user.passwordUpdatedAt ?? null,
        passwordPolicy.expiryEnabled,
        passwordPolicy.expiryDays,
        passwordPolicy.expiryWarningDays,
      );
      mustChangePassword = expiryResult.mustChangePassword;
      passwordExpiryWarning = expiryResult.passwordExpiryWarning;
    } catch {
      // 获取密码策略失败时不阻断登录
    }

    return {
      ...tokenResult,
      mustChangePassword,
      ...(passwordExpiryWarning ? { passwordExpiryWarning } : {}),
    };
  }

  /**
   * 存储验证码
   * @param captchaId 验证码ID
   * @param captchaText 验证码文本
   */
  async storeCaptcha(captchaId: string, captchaText: string): Promise<void> {
    const key = `captcha:${captchaId}`;
    await this.redisService.set(key, captchaText.toLowerCase(), AUTH_CONSTANTS.CAPTCHA_TTL);
  }

  /**
   * 验证验证码
   * @param captchaId 验证码ID
   * @param captchaInput 用户输入的验证码
   * @returns 验证成功返回 true，失败返回 false
   */
  async verifyCaptcha(captchaId: string, captchaInput: string): Promise<boolean> {
    const key = `captcha:${captchaId}`;
    const storedCaptcha = await this.redisService.get(key);

    if (!storedCaptcha) {
      return false;
    }

    await this.redisService.del(key);
    return storedCaptcha === captchaInput.toLowerCase();
  }

  /**
   * 生成访问令牌
   * @param payload 令牌载荷
   * @returns 访问令牌
   */
  generateToken(payload: any) {
    const accessToken = this.jwtService.sign(payload);
    this.redisService.set(
      this.getAccessTokenKey(payload),
      accessToken,
      ACCESS_TOKEN_EXPIRATION_TIME,
    );
    return {
      accessToken,
    };
  }

  /**
   * 切换当前角色
   * @param payload 当前令牌载荷
   * @param roleCode 要切换的角色编码
   * @returns 新的访问令牌
   */
  async switchCurrentRole(payload: any, roleCode: string) {
    const user = await this.userService.findByUsername(payload.username);
    
    if (!user) {
      throw new CustomException(ErrorCode.ERR_10002, '用户不存在');
    }
    
    if (!user.roles?.some((item: any) => item.enable)) {
      throw new CustomException(ErrorCode.ERR_11003);
    }
    
    const roleCodes = user.roles.map((item: any) => item.code);
    const currentRole = user.roles.find((item: any) => item.code === roleCode);
    
    if (!currentRole) {
      throw new CustomException(ErrorCode.ERR_11005, '您目前暂无此角色，请联系管理员申请权限');
    }
    
    payload = { ...payload, roleCodes, currentRoleCode: currentRole.code };
    return this.generateToken(payload);
  }

  /**
   * 用户登出
   * @param user 用户信息
   * @returns 登出成功返回 true
   */
  async logout(user: any): Promise<boolean> {
    if (user.userId) {
      await Promise.all([this.redisService.del(this.getAccessTokenKey(user))]);
      return true;
    }
    return false;
  }

  /**
   * 获取访问令牌的 Redis 键
   * @param payload 令牌载荷
   * @returns Redis 键
   */
  getAccessTokenKey(payload: any): string {
    return `${USER_ACCESS_TOKEN_KEY}:${payload.userId}`;
  }
  /**
   * 解码 JWT token（不验证签名和过期时间）
   * 用于 logout 等场景，仅需提取 payload 信息
   */
  decodeToken(token: string): any {
    try {
      return this.jwtService.decode(token);
    } catch {
      return null;
    }
  }


}

/**
 * 检查密码过期状态
 * 根据密码最后修改时间和策略配置，判断密码是否已过期或即将过期
 *
 * @param passwordUpdatedAt 密码最后修改时间，null 视为已过期
 * @param expiryEnabled 是否启用密码过期功能
 * @param expiryDays 密码有效天数
 * @param expiryWarningDays 过期提醒天数
 * @returns 过期状态对象
 */
export function checkPasswordExpiry(
  passwordUpdatedAt: Date | null,
  expiryEnabled: boolean,
  expiryDays: number,
  expiryWarningDays: number,
): { mustChangePassword: boolean; passwordExpiryWarning?: { remainingDays: number } } {
  // 未启用过期功能或过期天数无效时，不要求修改密码
  if (!expiryEnabled || expiryDays <= 0) {
    return { mustChangePassword: false };
  }

  // passwordUpdatedAt 为 null 视为已过期
  if (!passwordUpdatedAt) {
    return { mustChangePassword: true };
  }

  const now = new Date();
  const expiryDate = new Date(passwordUpdatedAt);
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  const remainingMs = expiryDate.getTime() - now.getTime();
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

  // 密码已过期
  if (remainingDays <= 0) {
    return { mustChangePassword: true };
  }

  // 密码即将过期，返回提醒
  if (expiryWarningDays > 0 && remainingDays <= expiryWarningDays) {
    return {
      mustChangePassword: false,
      passwordExpiryWarning: { remainingDays },
    };
  }

  // 密码未过期且不在提醒期内
  return { mustChangePassword: false };
}

