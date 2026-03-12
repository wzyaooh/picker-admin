import { CanActivate, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';

/**
 * 预览环境守卫
 * 在预览环境中阻止某些危险操作（如删除、修改等）
 */
@Injectable()
export class PreviewGuard implements CanActivate {
  constructor(protected readonly configService: ConfigService) {}

  /**
   * 验证是否为预览环境
   * @returns 是否允许访问（非预览环境返回 true）
   * @throws CustomException 当处于预览环境时抛出异常
   */
  canActivate(): boolean {
    if (this.configService.get('IS_PREVIEW') === 'true') {
      throw new CustomException(ErrorCode.ERR_30001);
    }
    return true;
  }
}
