import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { PasswordHistory } from './entities';

@Injectable()
export class PasswordHistoryService {
  private readonly logger = new Logger(PasswordHistoryService.name);

  constructor(
    @InjectRepository(PasswordHistory)
    private passwordHistoryRepo: Repository<PasswordHistory>,
  ) {}

  /**
   * 保存密码历史
   * @param userId 用户ID
   * @param passwordHash 加密后的密码
   */
  async savePasswordHistory(
    userId: number,
    passwordHash: string,
  ): Promise<void> {
    try {
      const history = this.passwordHistoryRepo.create({
        userId,
        passwordHash,
      });
      await this.passwordHistoryRepo.save(history);
      this.logger.log(`Password history saved for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to save password history for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 检查密码是否在历史记录中
   * @param userId 用户ID
   * @param passwordHash 加密后的密码
   * @param limit 检查最近几次密码（默认5次）
   * @returns 是否在历史记录中
   */
  async isPasswordInHistory(
    userId: number,
    passwordHash: string,
    limit: number = 5,
  ): Promise<boolean> {
    try {
      const histories = await this.passwordHistoryRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: limit,
        select: ['passwordHash'],
      });

      return histories.some((history) => history.passwordHash === passwordHash);
    } catch (error) {
      this.logger.error(
        `Failed to check password history for user ${userId}: ${error.message}`,
      );
      // 如果查询失败，为了安全起见，返回 false（允许修改密码）
      return false;
    }
  }

  /**
   * 清理旧的密码历史记录
   * @param userId 用户ID
   * @param keepCount 保留最近几条记录（默认10条）
   */
  async cleanOldPasswordHistory(
    userId: number,
    keepCount: number = 10,
  ): Promise<void> {
    try {
      // 获取需要保留的记录
      const historiesToKeep = await this.passwordHistoryRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: keepCount,
        select: ['id', 'createdAt'],
      });

      if (historiesToKeep.length === 0) {
        return;
      }

      // 获取最旧的保留记录的时间
      const oldestKeepDate =
        historiesToKeep[historiesToKeep.length - 1].createdAt;

      // 删除比这个时间更早的记录
      const result = await this.passwordHistoryRepo.delete({
        userId,
        createdAt: LessThan(oldestKeepDate),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(
          `Cleaned ${result.affected} old password history records for user ${userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to clean old password history for user ${userId}: ${error.message}`,
      );
      // 清理失败不影响主流程，只记录日志
    }
  }

  /**
   * 获取用户的密码历史记录数量
   * @param userId 用户ID
   * @returns 历史记录数量
   */
  async getPasswordHistoryCount(userId: number): Promise<number> {
    try {
      return await this.passwordHistoryRepo.count({ where: { userId } });
    } catch (error) {
      this.logger.error(
        `Failed to get password history count for user ${userId}: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * 删除用户的所有密码历史记录
   * @param userId 用户ID
   */
  async deleteUserPasswordHistory(userId: number): Promise<void> {
    try {
      await this.passwordHistoryRepo.delete({ userId });
      this.logger.log(`Deleted all password history for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete password history for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }
}
