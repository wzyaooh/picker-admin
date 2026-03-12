import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { compareSync } from 'bcryptjs';

import { PasswordHistory } from './entities';
import { SecurityConfigService } from '@/modules/security-config/security-config.service';

/**
 * 密码历史服务
 * 提供密码历史的保存、检查和清理功能
 */
@Injectable()
export class PasswordHistoryService {
  constructor(
    @InjectRepository(PasswordHistory)
    private readonly passwordHistoryRepo: Repository<PasswordHistory>,
    private readonly securityConfigService: SecurityConfigService,
  ) {}

  /**
   * 保存密码历史
   * @param userId 用户ID
   * @param passwordHash 密码哈希值
   * @param changedBy 修改人ID（可选）
   * @param changeReason 修改原因（可选）
   * @param ipAddress IP地址（可选）
   */
  async savePasswordHistory(
    userId: number,
    passwordHash: string,
    changedBy?: number,
    changeReason?: string,
    ipAddress?: string,
  ): Promise<void> {
    // 保存新密码历史
    const history = this.passwordHistoryRepo.create({
      userId,
      passwordHash,
      changedBy,
      changeReason,
      ipAddress,
    });

    await this.passwordHistoryRepo.save(history);

    // 清理旧密码历史（保留最近 N 条）
    await this.cleanupOldPasswords(userId);
  }

  /**
   * 检查密码是否与历史密码重复
   * @param userId 用户ID
   * @param plainPassword 明文密码
   * @returns 如果与历史密码重复返回 true，否则返回 false
   */
  async checkPasswordHistory(userId: number, plainPassword: string): Promise<boolean> {
    // 获取密码策略配置
    const policy = await this.securityConfigService.getPasswordPolicy();

    if (!policy.rememberPasswordCount || policy.rememberPasswordCount === 0) {
      // 未启用历史密码限制
      return false;
    }

    // 获取最近 N 条密码历史
    const histories = await this.passwordHistoryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: policy.rememberPasswordCount,
    });

    // 检查是否与历史密码重复
    for (const history of histories) {
      if (compareSync(plainPassword, history.passwordHash)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 清理旧密码历史
   * 保留最近 N 条记录，删除更早的记录
   * @param userId 用户ID
   */
  async cleanupOldPasswords(userId: number): Promise<void> {
    const policy = await this.securityConfigService.getPasswordPolicy();

    if (!policy.rememberPasswordCount || policy.rememberPasswordCount === 0) {
      // 未启用历史密码限制，不需要清理
      return;
    }

    // 获取所有密码历史，按时间倒序
    const allHistories = await this.passwordHistoryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // 如果记录数超过限制，删除多余的记录
    if (allHistories.length > policy.rememberPasswordCount) {
      const toDelete = allHistories.slice(policy.rememberPasswordCount);
      const idsToDelete = toDelete.map((h) => h.id);

      await this.passwordHistoryRepo.delete(idsToDelete);
    }
  }

  /**
   * 获取用户的密码历史记录
   * @param userId 用户ID
   * @param limit 限制返回数量（可选）
   * @returns 密码历史记录列表
   */
  async getUserPasswordHistory(userId: number, limit?: number): Promise<PasswordHistory[]> {
    const query = this.passwordHistoryRepo
      .createQueryBuilder('history')
      .where('history.userId = :userId', { userId })
      .orderBy('history.createdAt', 'DESC');

    if (limit) {
      query.take(limit);
    }

    return query.getMany();
  }

  /**
   * 批量清理过期的密码历史
   * 用于定时任务，清理所有用户的过期密码历史
   */
  async cleanupAllExpiredPasswords(): Promise<void> {
    const policy = await this.securityConfigService.getPasswordPolicy();

    if (!policy.rememberPasswordCount || policy.rememberPasswordCount === 0) {
      return;
    }

    // 获取所有用户ID
    const userIds = await this.passwordHistoryRepo
      .createQueryBuilder('history')
      .select('DISTINCT history.userId', 'userId')
      .getRawMany();

    // 为每个用户清理旧密码
    for (const { userId } of userIds) {
      await this.cleanupOldPasswords(userId);
    }
  }
}
