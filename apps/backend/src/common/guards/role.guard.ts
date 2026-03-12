import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';

/**
 * 角色守卫
 * 验证用户当前角色是否在允许的角色列表中
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * 验证用户角色
   * @param context 执行上下文
   * @returns 是否有权限访问
   * @throws CustomException 当用户无角色或角色不匹配时抛出异常
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    const currentRoleCode = user.currentRoleCode;
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    
    // 当前用户没有角色
    if (!currentRoleCode) {
      throw new CustomException(ErrorCode.ERR_11005);
    }
    
    if (!roles?.length) {
      return true;
    }
    
    // 当前角色不在可操作角色范围内
    if (!roles.includes(currentRoleCode)) {
      throw new CustomException(ErrorCode.ERR_11003);
    }
    
    return true;
  }
}
