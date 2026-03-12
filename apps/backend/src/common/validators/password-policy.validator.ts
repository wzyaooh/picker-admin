import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { SecurityConfigService } from '@/modules/security-config/security-config.service';
import { PasswordHistoryService } from '@/modules/password-history/password-history.service';

/**
 * 密码验证结果
 */
export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
}

/**
 * 密码策略验证器
 */
@ValidatorConstraint({ name: 'passwordPolicy', async: true })
@Injectable()
export class PasswordPolicyValidator implements ValidatorConstraintInterface {
  constructor(
    private readonly securityConfigService: SecurityConfigService,
    private readonly passwordHistoryService: PasswordHistoryService,
  ) {}

  /**
   * 验证密码是否符合策略
   */
  async validate(password: string, args: ValidationArguments): Promise<boolean> {
    const result = await this.validatePassword(password);
    return result.valid;
  }

  /**
   * 获取默认错误消息
   */
  defaultMessage(args: ValidationArguments): string {
    return '密码不符合安全策略要求';
  }

  /**
   * 验证密码（详细版本）
   * @param password 明文密码
   * @param userId 用户ID（可选，用于检查历史密码）
   */
  async validatePassword(
    password: string,
    userId?: number,
  ): Promise<PasswordValidationResult> {
    if (!password) {
      return {
        valid: false,
        message: '密码不能为空',
      };
    }

    // 获取密码策略配置
    const policy = await this.securityConfigService.getPasswordPolicy();

    const errors: string[] = [];

    // 1. 验证密码长度
    if (password.length < policy.minLength) {
      errors.push(`密码长度不能少于 ${policy.minLength} 个字符`);
    }

    if (password.length > policy.maxLength) {
      errors.push(`密码长度不能超过 ${policy.maxLength} 个字符`);
    }

    // 2. 验证密码复杂度
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密码必须包含至少一个大写字母');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('密码必须包含至少一个小写字母');
    }

    if (policy.requireNumber && !/[0-9]/.test(password)) {
      errors.push('密码必须包含至少一个数字');
    }

    if (policy.requireSpecial) {
      const specialCharsRegex = new RegExp(`[${this.escapeRegExp(policy.specialChars)}]`);
      if (!specialCharsRegex.test(password)) {
        errors.push(`密码必须包含至少一个特殊字符 (${policy.specialChars})`);
      }
    }

    // 3. 验证历史密码（如果提供了 userId 且启用了历史密码限制）
    if (userId && policy.rememberPasswordCount > 0) {
      const isInHistory = await this.passwordHistoryService.checkPasswordHistory(
        userId,
        password,
      );

      if (isInHistory) {
        errors.push(
          `密码不能与最近 ${policy.rememberPasswordCount} 次使用过的密码相同`,
        );
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        message: errors.join('；'),
        errors,
      };
    }

    return { valid: true };
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 计算密码强度（0-100）
   */
  calculatePasswordStrength(password: string): number {
    if (!password) return 0;

    let strength = 0;

    // 长度得分（最多30分）
    if (password.length >= 8) strength += 10;
    if (password.length >= 12) strength += 10;
    if (password.length >= 16) strength += 10;

    // 复杂度得分（每种字符类型10分）
    if (/[A-Z]/.test(password)) strength += 10;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;

    // 多样性得分（最多30分）
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 8) strength += 10;
    if (uniqueChars >= 12) strength += 10;
    if (uniqueChars >= 16) strength += 10;

    return Math.min(strength, 100);
  }

  /**
   * 获取密码强度等级
   */
  getPasswordStrengthLevel(strength: number): 'weak' | 'medium' | 'good' | 'strong' {
    if (strength < 40) return 'weak';
    if (strength < 60) return 'medium';
    if (strength < 80) return 'good';
    return 'strong';
  }
}

/**
 * 密码策略验证装饰器
 */
export function ValidatePassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: PasswordPolicyValidator,
    });
  };
}
