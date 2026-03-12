import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';

import { AuditLog } from './audit-log.entity';
import { QueryAuditDto } from './dto';

/**
 * 审计日志服务
 * 提供审计日志的查询和写入功能
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * 分页查询审计日志
   * @param query 查询参数
   * @returns 分页结果
   */
  async findAll(query: QueryAuditDto) {
    const { page = 1, pageSize = 10, userId, username, action, method, path, startDate, endDate, success } = query;

    const queryBuilder = this.auditRepo.createQueryBuilder('audit');

    // 用户ID筛选
    if (userId !== undefined) {
      queryBuilder.andWhere('audit.userId = :userId', { userId });
    }

    // 用户名模糊查询
    if (username) {
      queryBuilder.andWhere('audit.username LIKE :username', { username: `%${username}%` });
    }

    // 操作类型筛选
    if (action) {
      queryBuilder.andWhere('audit.action = :action', { action });
    }

    // HTTP方法筛选
    if (method) {
      queryBuilder.andWhere('audit.method = :method', { method });
    }

    // 请求路径模糊查询
    if (path) {
      queryBuilder.andWhere('audit.path LIKE :path', { path: `%${path}%` });
    }

    // 成功状态筛选
    if (success !== undefined) {
      queryBuilder.andWhere('audit.success = :success', { success });
    }

    // 时间范围筛选
    if (startDate && endDate) {
      queryBuilder.andWhere('audit.time BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate + ' 23:59:59'),
      });
    } else if (startDate) {
      queryBuilder.andWhere('audit.time >= :startDate', { startDate: new Date(startDate) });
    } else if (endDate) {
      queryBuilder.andWhere('audit.time <= :endDate', { endDate: new Date(endDate + ' 23:59:59') });
    }

    // 分页和排序
    const [items, total] = await queryBuilder
      .orderBy('audit.time', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 查询审计日志详情
   * @param id 日志ID
   * @returns 审计日志详细信息
   */
  async findOne(id: number): Promise<AuditLog> {
    const log = await this.auditRepo.findOne({ where: { id } });

    if (!log) {
      throw new CustomException(ErrorCode.ERR_20002, '审计日志不存在');
    }

    return log;
  }

  /**
   * 查询最近的审计日志
   * @param take 查询数量，默认 20 条
   * @returns 审计日志列表
   */
  findRecent(take = 20): Promise<AuditLog[]> {
    return this.auditRepo.find({
      order: { time: 'DESC' },
      take,
    });
  }

  /**
   * 写入审计日志
   * @param log 审计日志数据
   */
  async write(log: Partial<AuditLog>): Promise<void> {
    try {
      const entity = this.auditRepo.create(log);
      await this.auditRepo.save(entity);
    } catch (error) {
      // 静默失败，不影响主业务流程
      return;
    }
  }

  /**
   * 清理过期的审计日志
   * @param retentionDays 保留天数
   * @returns 删除的记录数
   */
  async cleanupOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.auditRepo
      .createQueryBuilder()
      .delete()
      .where('time < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * 获取审计日志统计信息
   * @returns 统计信息
   */
  async getStatistics() {
    const total = await this.auditRepo.count();
    const oldestLog = await this.auditRepo.findOne({
      order: { time: 'ASC' },
      select: ['time'],
    });
    const newestLog = await this.auditRepo.findOne({
      order: { time: 'DESC' },
      select: ['time'],
    });

    return {
      total,
      oldestDate: oldestLog?.time,
      newestDate: newestLog?.time,
    };
  }
}
