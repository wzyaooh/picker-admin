import { SetMetadata } from '@nestjs/common';

/**
 * 角色装饰器
 * 用于标记接口所需的角色权限
 * @param roles 允许访问的角色代码列表
 * @returns 装饰器函数
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
