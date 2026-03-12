// 第三方库
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import * as svgCaptcha from 'svg-captcha';
import { randomUUID } from 'crypto';

// 项目内部模块
import { JwtGuard, LocalGuard, PreviewGuard } from '@/common/guards';
import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { Audit } from '@/common/decorators';
import { AUTH_CONSTANTS } from '@/constants';
import { UserService } from '@/modules/user/user.service';
import { PasswordPolicyValidator } from '@/common/validators/password-policy.validator';
import { SecurityConfigService } from '@/modules/security-config/security-config.service';

// 相对路径导入
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterUserDto } from './dto';

/**
 * 认证控制器
 * 提供用户认证相关的 HTTP 接口，包括登录、注册、登出、令牌刷新、验证码生成等功能
 */
@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly passwordPolicyValidator: PasswordPolicyValidator,
    private readonly securityConfigService: SecurityConfigService,
  ) {}

  /**
   * 用户登录
   * @param req 请求对象（包含经过 LocalGuard 验证的用户信息）
   * @param body 登录数据传输对象
   * @returns 登录令牌和用户信息
   * @throws CustomException 当验证码错误或已过期时抛出异常
   */
  @UseGuards(LocalGuard)
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Audit({ description: '用户登录' })
  @ApiOperation({ summary: '用户登录' })
  async login(@Req() req: any, @Body() body: LoginDto) {
    // 预览环境下可快速登录，不用验证码
    if (this.configService.get('IS_PREVIEW') === 'true' && body.isQuick) {
      return this.authService.login(req.user, req.ip);
    }

    // 验证验证码
    if (!body.captchaId || !body.captcha || typeof body.captcha !== 'string') {
      throw new CustomException(ErrorCode.ERR_10003, '请提供验证码');
    }

    const isValid = await this.authService.verifyCaptcha(body.captchaId, body.captcha);
    if (!isValid) {
      throw new CustomException(ErrorCode.ERR_10003, '验证码错误或已过期');
    }

    return this.authService.login(req.user, req.ip);
  }

  /**
   * 用户注册
   * @param user 注册用户数据传输对象
   * @returns 创建的用户信息
   */
  @Post('register')
  @UseGuards(PreviewGuard)
  @Audit({ description: '用户注册' })
  @ApiOperation({ summary: '用户注册' })
  async register(@Body() user: RegisterUserDto) {
    return this.userService.create(user);
  }

  /**
   * 刷新访问令牌
   * @param req 请求对象（包含当前用户信息）
   * @returns 新的访问令牌
   */
  @Get('refresh/token')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('bearer')
  @Audit({ description: '刷新访问令牌' })
  @ApiOperation({ summary: '刷新访问令牌' })
  async refreshToken(@Req() req: any) {
    return this.authService.generateToken(req.user);
  }

  /**
   * 切换当前角色
   * @param req 请求对象（包含当前用户信息）
   * @param roleCode 要切换到的角色代码
   * @returns 新的令牌和角色信息
   */
  @Post('current-role/switch/:roleCode')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('bearer')
  @Audit({ description: '切换当前角色' })
  @ApiOperation({ summary: '切换当前角色' })
  async switchCurrentRole(@Req() req: any, @Param('roleCode') roleCode: string) {
    return this.authService.switchCurrentRole(req.user, roleCode);
  }

  /**
   * 用户登出
   * 不使用 JwtGuard，手动尝试清理 token
   * 避免 token 已失效时返回 401 导致前端无限循环（如修改密码后 token 已被后端清除）
   */
  @Post('logout')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '用户登出' })
  async logout(@Req() req: any) {
    try {
      // 手动从 Authorization header 解析 JWT payload
      const authHeader = req.headers?.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const payload = this.authService.decodeToken(token);
        if (payload?.userId) {
          await this.authService.logout(payload);
        }
      }
    } catch {
      // token 无效或已过期，忽略错误
    }
    return true;
  }

  /**
   * 获取验证码
   * @returns 验证码图片（base64编码的SVG）和唯一标识
   */
  @Get('captcha')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Audit({ description: '获取验证码' })
  @ApiOperation({ summary: '获取验证码' })
  async createCaptcha() {
    const captcha = svgCaptcha.create({
      size: AUTH_CONSTANTS.CAPTCHA_LENGTH,
      fontSize: AUTH_CONSTANTS.CAPTCHA_FONT_SIZE,
      width: AUTH_CONSTANTS.CAPTCHA_WIDTH,
      height: AUTH_CONSTANTS.CAPTCHA_HEIGHT,
      background: '#fff',
      color: true,
    });

    // 生成唯一标识
    const captchaId = randomUUID();

    // 存储到 Redis
    await this.authService.storeCaptcha(captchaId, captcha.text);

    // 返回验证码图片和 ID
    return {
      captchaId,
      svg: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`,
    };
  }

  /**
   * 获取密码策略（公开接口，无需认证）
   * 仅返回密码复杂度相关的公开字段，不包含过期、历史密码等内部管理字段
   */
  @Get('password-policy')
  @ApiOperation({ summary: '获取密码策略（公开）' })
  async getPublicPasswordPolicy() {
    const policy = await this.securityConfigService.getPasswordPolicy();
    return {
      minLength: policy.minLength,
      maxLength: policy.maxLength,
      requireUppercase: policy.requireUppercase,
      requireLowercase: policy.requireLowercase,
      requireNumber: policy.requireNumber,
      requireSpecial: policy.requireSpecial,
    };
  }


  /**
   * 修改密码
   * @param req 请求对象（包含当前用户信息）
   * @param body 修改密码数据传输对象
   * @returns 修改结果
   * @throws CustomException 当旧密码错误时抛出异常
   */
  @Post('password')
  @UseGuards(JwtGuard, PreviewGuard)
  @ApiBearerAuth('bearer')
  @Audit({ description: '修改密码', saveReqBody: false })
  @ApiOperation({ summary: '修改密码' })
  async changePassword(@Req() req: any, @Body() body: ChangePasswordDto) {
    const ret = await this.authService.validateUser(req.user.username, body.oldPassword);
    if (!ret) {
      throw new CustomException(ErrorCode.ERR_10004, '旧密码错误');
    }
    
    // 验证新密码（包括历史密码检查）
    const validationResult = await this.passwordPolicyValidator.validatePassword(
      body.newPassword,
      req.user.userId,
    );
    
    if (!validationResult.valid) {
      throw new CustomException(ErrorCode.ERR_10302, validationResult.message);
    }
    
    // 修改密码（会自动保存密码历史）
    await this.userService.resetPassword(req.user.userId, body.newPassword);
    
    // 修改密码后退出登录
    await this.authService.logout(req.user);
    return true;
  }

  /**
   * 获取用户权限码
   * @param req 请求对象（包含当前用户信息）
   * @returns 用户的所有权限码列表
   */
  @Get('codes')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('bearer')
  @Audit({ description: '获取用户权限码' })
  @ApiOperation({ summary: '获取用户权限码' })
  async getAccessCodes(@Req() req: any) {
    const user = await this.userService.findByUsername(req.user.username);
    if (!user || !user.roles) {
      return [];
    }

    // 收集所有角色的权限码
    const codes: string[] = [];
    for (const role of user.roles) {
      if (role.permissions) {
        for (const permission of role.permissions) {
          if (permission.code && !codes.includes(permission.code)) {
            codes.push(permission.code);
          }
        }
      }
    }

    return codes;
  }
}
