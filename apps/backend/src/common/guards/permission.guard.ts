import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';

/**
 * 权限守卫
 * 验证用户是否具有访问资源所需的角色权限
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * 验证用户权限
   * @param context 执行上下文
   * @returns 是否有权限访问
   * @throws CustomException 当用户无角色或角色不匹配时抛出异常
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    
    // 当前角色不在可操作角色范围内
    if (!user.currentRoleCode) {
      throw new CustomException(ErrorCode.ERR_11005);
    }

    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles?.length) {
      return true;
    }
    
    const hasRole = roles.includes(user.currentRoleCode);
    if (!hasRole) {
      throw new CustomException(ErrorCode.ERR_11003);
    }
    
    return true;
  }
}
