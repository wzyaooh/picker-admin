import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard, RoleGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators';
import { SecurityConfigService } from './security-config.service';
import { UpdateSecurityConfigDto, UpdateEmailConfigDto } from './dto/update-security-config.dto';

/**
 * 安全配置控制器
 * 提供安全配置的查询和更新接口
 */
@ApiTags('安全配置')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard, RoleGuard)
@Controller('security-config')
export class SecurityConfigController {
  constructor(
    private readonly securityConfigService: SecurityConfigService,
  ) {}

  /**
   * 获取安全配置
   * @returns 当前的安全配置
   */
  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: '获取安全配置', description: '获取系统当前的安全配置信息' })
  async getConfig() {
    return this.securityConfigService.getConfig();
  }

  /**
   * 获取密码策略配置
   * @returns 密码策略配置
   */
  @Get('password-policy')
  @ApiOperation({ summary: '获取密码策略', description: '获取系统密码策略配置' })
  async getPasswordPolicy() {
    return this.securityConfigService.getPasswordPolicy();
  }

  /**
   * 获取账号锁定策略配置
   * @returns 账号锁定策略配置
   */
  @Get('account-lockout')
  @ApiOperation({ summary: '获取账号锁定策略', description: '获取系统账号锁定策略配置' })
  async getAccountLockout() {
    return this.securityConfigService.getAccountLockout();
  }

  /**
   * 更新安全配置
   * @param dto 更新的配置数据
   * @returns 更新后的配置
   */
  @Patch()
  @Roles('SUPER_ADMIN')
  @Audit({ description: '更新安全配置', saveReqBody: true })
  @ApiOperation({ summary: '更新安全配置', description: '更新系统安全配置' })
  async updateConfig(@Body() dto: UpdateSecurityConfigDto) {
    return this.securityConfigService.updateConfig(dto);
  }

  /**
   * 重置安全配置为默认值
   * @returns 重置后的配置
   */
  @Patch('reset')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '重置安全配置为默认值' })
  @ApiOperation({ summary: '重置安全配置', description: '将安全配置重置为系统默认值' })
  async resetConfig() {
    return this.securityConfigService.resetToDefault();
  }

  // ==================== 邮件配置接口 ====================

  @Get('email')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: '获取邮件配置' })
  async getEmailConfig() {
    return this.securityConfigService.getEmailConfig();
  }

  @Patch('email')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '更新邮件配置', saveReqBody: true })
  @ApiOperation({ summary: '更新邮件配置' })
  async updateEmailConfig(@Body() dto: UpdateEmailConfigDto) {
    return this.securityConfigService.updateEmailConfig(dto);
  }

  @Patch('email/reset')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '重置邮件配置为默认值' })
  @ApiOperation({ summary: '重置邮件配置' })
  async resetEmailConfig() {
    return this.securityConfigService.resetEmailConfig();
  }
}
