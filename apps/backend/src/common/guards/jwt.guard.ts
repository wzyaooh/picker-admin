import { AuthGuard } from '@nestjs/passport';

/**
 * JWT 认证守卫
 * 使用 Passport JWT 策略验证请求中的 Bearer Token
 */
export class JwtGuard extends AuthGuard('jwt') {
  constructor() {
    super();
  }
}
