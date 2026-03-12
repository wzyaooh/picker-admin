import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';

/**
 * 上传速率限制守卫
 * 使用内存存储，简单实现（生产环境建议使用 Redis）
 */
@Injectable()
export class UploadRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(UploadRateLimitGuard.name);
  
  // 存储用户上传记录：userId -> 上传时间戳数组
  private readonly uploadRecords = new Map<number, number[]>();
  
  // 时间窗口（毫秒）
  private readonly TIME_WINDOW = parseInt(process.env.UPLOAD_RATE_WINDOW || '60000', 10); // 默认 60 秒
  
  // 时间窗口内最大上传次数
  private readonly MAX_UPLOADS = parseInt(process.env.UPLOAD_RATE_LIMIT || '20', 10); // 默认 20 次

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      // 如果没有用户信息，放行（由其他守卫处理认证）
      return true;
    }

    const now = Date.now();
    
    // 获取用户的上传记录
    let records = this.uploadRecords.get(userId);
    
    if (!records) {
      records = [];
      this.uploadRecords.set(userId, records);
    }

    // 清理过期记录（超出时间窗口的记录）
    const validRecords = records.filter(timestamp => now - timestamp < this.TIME_WINDOW);
    
    // 检查是否超过限制
    if (validRecords.length >= this.MAX_UPLOADS) {
      const oldestRecord = validRecords[0];
      const waitTime = Math.ceil((this.TIME_WINDOW - (now - oldestRecord)) / 1000);
      
      this.logger.warn(
        `User ${userId} exceeded upload rate limit: ${validRecords.length}/${this.MAX_UPLOADS} in ${this.TIME_WINDOW}ms`
      );
      
      throw new CustomException(
        ErrorCode.ERR_20104,
        `上传过于频繁，请 ${waitTime} 秒后再试。` +
        `（限制：${this.TIME_WINDOW / 1000} 秒内最多上传 ${this.MAX_UPLOADS} 个文件）`,
      );
    }

    // 记录本次上传
    validRecords.push(now);
    this.uploadRecords.set(userId, validRecords);

    // 定期清理内存（每 5 分钟清理一次过期记录）
    this.scheduleCleanup();

    return true;
  }

  /**
   * 定期清理过期记录
   */
  private scheduleCleanup() {
    // 使用简单的定时清理策略
    if (!this.cleanupScheduled) {
      this.cleanupScheduled = true;
      setTimeout(() => {
        this.cleanup();
        this.cleanupScheduled = false;
      }, 5 * 60 * 1000); // 5 分钟
    }
  }

  private cleanupScheduled = false;

  /**
   * 清理过期记录
   */
  private cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, records] of this.uploadRecords.entries()) {
      const validRecords = records.filter(timestamp => now - timestamp < this.TIME_WINDOW);
      
      if (validRecords.length === 0) {
        // 如果没有有效记录，删除该用户的记录
        this.uploadRecords.delete(userId);
        cleanedCount++;
      } else if (validRecords.length < records.length) {
        // 如果有部分记录过期，更新记录
        this.uploadRecords.set(userId, validRecords);
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired upload records`);
    }
  }

  /**
   * 重置用户的上传记录（用于测试或管理）
   */
  resetUserRecords(userId: number) {
    this.uploadRecords.delete(userId);
    this.logger.log(`Reset upload records for user ${userId}`);
  }

  /**
   * 获取用户当前的上传次数
   */
  getUserUploadCount(userId: number): number {
    const records = this.uploadRecords.get(userId);
    if (!records) return 0;

    const now = Date.now();
    return records.filter(timestamp => now - timestamp < this.TIME_WINDOW).length;
  }
}
