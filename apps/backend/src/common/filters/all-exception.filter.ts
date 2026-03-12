import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * 全局异常过滤器
 * 捕获所有未处理的异常并返回统一的错误响应格式
 */
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * 捕获并处理异常
   * @param exception 异常对象
   * @param host 参数主机对象
   */
  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const exceptionResponse = exception.getResponse?.();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestId = (request as any).requestId;
    
    // 提取错误消息
    let message = exception.message;
    if (exceptionResponse) {
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse.message) {
        message = exceptionResponse.message;
      }
    }
    
    // 将消息转换为字符串
    let msg = Array.isArray(message) ? message.join('; ') : String(message);
    
    // 友好化错误消息
    msg = this.makeFriendlyErrorMessage(msg);
    
    this.logger.error(
      `[HTTP_ERROR] ${request.method} ${request.originalUrl} ${status}${requestId ? ` requestId=${requestId}` : ''} - ${msg}`,
      exception?.stack,
      'Exception',
    );

    // 构建响应
    const errorResponse: any = {
      code: exception.code ?? status,
      message: msg,
      originUrl: request.originalUrl,
    };
    
    // 只在开发环境返回 error 字段
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.error = exception.name;
    }

    response.status(status).json(errorResponse);
  }

  /**
   * 将技术性错误消息转换为用户友好的消息
   */
  private makeFriendlyErrorMessage(message: string): string {
    // 字段名映射（中文化）
    const fieldNameMap: Record<string, string> = {
      'enable': '启用状态',
      'code': '编码',
      'name': '名称',
      'label': '标签',
      'value': '值',
      'description': '描述',
      'sort': '排序',
      'username': '用户名',
      'password': '密码',
      'email': '邮箱',
      'phone': '手机号',
      'roleIds': '角色',
      'departmentId': '部门',
      'positionId': '岗位',
    };

    // 错误类型映射（中文化）
    const errorTypeMap: Record<string, string> = {
      'must be a boolean value': '必须是布尔值（true/false）',
      'must be a boolean': '必须是布尔值（true/false）',
      'must be a string': '必须是文本',
      'must be a number': '必须是数字',
      'must be an integer': '必须是整数',
      'should not be empty': '不能为空',
      'must be longer than': '长度不足',
      'must be shorter than': '长度超出限制',
      'must match': '格式不正确',
      'already exists': '已存在',
      'not found': '不存在',
      'is required': '为必填项',
      'must not be empty': '不能为空',
      'must be positive': '必须是正数',
    };

    let friendlyMessage = message;

    // 替换字段名
    Object.entries(fieldNameMap).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      friendlyMessage = friendlyMessage.replace(regex, value);
    });

    // 替换错误类型
    Object.entries(errorTypeMap).forEach(([key, value]) => {
      if (friendlyMessage.toLowerCase().includes(key.toLowerCase())) {
        friendlyMessage = friendlyMessage.replace(new RegExp(key, 'gi'), value);
      }
    });

    return friendlyMessage;
  }
}
