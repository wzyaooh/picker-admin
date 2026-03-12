import { HttpException, HttpStatus } from '@nestjs/common';

import { ERR, ErrInfo } from './error-code';

/**
 * 自定义异常类
 * 用于抛出业务异常，包含错误码和错误消息
 */
export class CustomException extends HttpException {
  protected code: number;

  /**
   * 创建自定义异常
   * @param err 错误信息对象（包含 code 和 message）
   * @param message 自定义错误消息（可选，默认使用 err.message）
   * @param status HTTP 状态码（可选，默认 400）
   */
  constructor(err: ErrInfo, message?: string, status?: HttpStatus) {
    const errorCode = (err as { code: number }).code;
    const errorMessage = (err as { message: string }).message || `Error code: ${errorCode}`;
    const finalMessage = message || errorMessage;
    super(finalMessage, status ?? HttpStatus.BAD_REQUEST);
    this.code = errorCode;
  }
}

export { ERR as ErrorCode };
