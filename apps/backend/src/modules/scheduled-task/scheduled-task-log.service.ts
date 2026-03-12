import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ScheduledTaskLog } from './entities';
import { QueryScheduledTaskLogDto } from './dto';

@Injectable()
export class ScheduledTaskLogService {
  private readonly logger = new Logger(ScheduledTaskLogService.name);

  constructor(
    @InjectRepository(ScheduledTaskLog)
    private readonly logRepo: Repository<ScheduledTaskLog>,
  ) {}

  async createLog(data: Partial<ScheduledTaskLog>): Promise<ScheduledTaskLog> {
    const entity = this.logRepo.create(data);
    return this.logRepo.save(entity);
  }

  async findAll(query: QueryScheduledTaskLogDto) {
    const {
      page = 1,
      pageSize = 10,
      taskName,
      status,
      startTimeFrom,
      startTimeTo,
    } = query;

    const qb = this.logRepo.createQueryBuilder('log');

    if (taskName) {
      qb.andWhere('log.taskName LIKE :taskName', {
        taskName: `%${taskName}%`,
      });
    }

    if (status) {
      qb.andWhere('log.status = :status', { status });
    }

    if (startTimeFrom) {
      qb.andWhere('log.startTime >= :startTimeFrom', { startTimeFrom });
    }

    if (startTimeTo) {
      qb.andWhere('log.startTime <= :startTimeTo', { startTimeTo });
    }

    const [pageData, total] = await qb
      .orderBy('log.startTime', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { pageData, total };
  }

  async removeByTaskId(taskId: number): Promise<boolean> {
    await this.logRepo.delete({ taskId });
    return true;
  }

  async removeAll(): Promise<boolean> {
    await this.logRepo.clear();
    return true;
  }
}
