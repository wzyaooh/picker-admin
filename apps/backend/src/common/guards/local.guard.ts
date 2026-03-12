import { AuthGuard } from '@nestjs/passport';

/**
 * 本地认证守卫
 * 使用 Passport Local 策略验证用户名和密码
 */
export class LocalGuard extends AuthGuard('local') {
  constructor() {
    super();
  }
}
