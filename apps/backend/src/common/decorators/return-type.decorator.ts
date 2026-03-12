import { SetMetadata } from '@nestjs/common';

import { ReturnType as Type } from '@/types';

/**
 * 返回类型装饰器
 * 用于标记接口的返回类型，控制响应格式
 * @param returnType 返回类型（primitive: 原始类型，不包装；默认: 包装为统一响应格式）
 * @returns 装饰器函数
 */
export const ReturnType = (returnType: Type) => SetMetadata('returnType', returnType);
