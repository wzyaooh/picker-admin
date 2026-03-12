import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CronJob } from 'cron';
import { CronExpressionParser } from 'cron-parser';
import { Repository } from 'typeorm';

import {
  CustomException,
  ErrorCode,
} from '@/common/exceptions/custom.exception';

import {
  CreateScheduledTaskDto,
  QueryScheduledTaskDto,
  UpdateScheduledTaskDto,
} from './dto';
import { ScheduledTask } from './entities';
import { ScheduledTaskLogService } from './scheduled-task-log.service';
import { TaskExecutionEngine } from './task-execution.engine';

@Injectable()
export class ScheduledTaskService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledTaskService.name);

  constructor(
    @InjectRepository(ScheduledTask)
    private readonly taskRepo: Repository<ScheduledTask>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly executionEngine: TaskExecutionEngine,
    private readonly logService: ScheduledTaskLogService,
  ) {}

  async onModuleInit() {
    const tasks = await this.taskRepo.find({ where: { enabled: 1 } });
    for (const task of tasks) {
      try {
        this.registerSchedule(task);
        this.logger.log(`Registered schedule for task: ${task.name}`);
      } catch (error) {
        this.logger.error(
          `Failed to register schedule for task [${task.name}]: ${error}`,
        );
      }
    }
    this.logger.log(`Loaded ${tasks.length} enabled tasks on startup`);
  }

  async create(dto: CreateScheduledTaskDto): Promise<ScheduledTask> {
    // 验证名称唯一性
    const existing = await this.taskRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new CustomException(ErrorCode.ERR_20001, '任务名称已存在');
    }

    // 验证触发配置
    this.validateTriggerConfig(dto.triggerType, dto.cronExpression, dto.intervalSeconds);

    const entity = this.taskRepo.create(dto);
    const saved = await this.taskRepo.save(entity);

    // 如果启用则注册调度
    if (saved.enabled === 1) {
      this.registerSchedule(saved);
    }

    return saved;
  }

  async findAll(query: QueryScheduledTaskDto) {
    const { page = 1, pageSize = 10, name, taskGroup, enabled } = query;

    const qb = this.taskRepo.createQueryBuilder('task');

    if (name) {
      qb.andWhere('task.name LIKE :name', { name: `%${name}%` });
    }

    if (taskGroup) {
      qb.andWhere('task.taskGroup = :taskGroup', { taskGroup });
    }

    if (enabled !== undefined && enabled !== null) {
      qb.andWhere('task.enabled = :enabled', { enabled });
    }

    const [pageData, total] = await qb
      .orderBy('task.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { pageData, total };
  }

  async findOne(id: number): Promise<ScheduledTask> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) {
      throw new CustomException(ErrorCode.ERR_20002, '任务不存在');
    }
    return task;
  }

  async update(id: number, dto: UpdateScheduledTaskDto): Promise<ScheduledTask> {
    const task = await this.findOne(id);

    // 如果更新了名称，检查唯一性
    if (dto.name && dto.name !== task.name) {
      const existing = await this.taskRepo.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new CustomException(ErrorCode.ERR_20001, '任务名称已存在');
      }
    }

    // 验证触发配置
    const triggerType = dto.triggerType ?? task.triggerType;
    const cronExpression = dto.cronExpression ?? task.cronExpression;
    const intervalSeconds = dto.intervalSeconds ?? task.intervalSeconds;
    this.validateTriggerConfig(triggerType, cronExpression, intervalSeconds);

    Object.assign(task, dto);
    const updated = await this.taskRepo.save(task);

    // 如果任务处于启用状态，重新注册调度
    if (updated.enabled === 1) {
      this.unregisterSchedule(updated.id);
      this.registerSchedule(updated);
    }

    return updated;
  }

  async remove(id: number): Promise<boolean> {
    const task = await this.findOne(id);

    // 取消调度
    this.unregisterSchedule(task.id);

    // 删除关联日志
    await this.logService.removeByTaskId(task.id);

    // 删除任务
    await this.taskRepo.remove(task);

    return true;
  }

  async enable(id: number): Promise<ScheduledTask> {
    const task = await this.findOne(id);
    task.enabled = 1;
    const saved = await this.taskRepo.save(task);
    this.registerSchedule(saved);
    return saved;
  }

  async disable(id: number): Promise<ScheduledTask> {
    const task = await this.findOne(id);
    task.enabled = 0;
    const saved = await this.taskRepo.save(task);
    this.unregisterSchedule(saved.id);
    return saved;
  }

  async trigger(id: number): Promise<void> {
    const task = await this.findOne(id);
    await this.executionEngine.execute(task, 'MANUAL');
  }

  registerSchedule(task: ScheduledTask): void {
    const jobName = `task-${task.id}`;

    if (task.triggerType === 'CRON') {
      const job = new CronJob(task.cronExpression, () => {
        this.executionEngine.execute(task, 'SCHEDULE').catch((err) => {
          this.logger.error(`Scheduled execution failed for task [${task.name}]: ${err}`);
        });
      });
      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();
      this.logger.log(`Registered CronJob [${jobName}]: ${task.cronExpression}`);
    } else if (task.triggerType === 'INTERVAL') {
      const intervalMs = task.intervalSeconds * 1000;
      const interval = setInterval(() => {
        this.executionEngine.execute(task, 'SCHEDULE').catch((err) => {
          this.logger.error(`Scheduled execution failed for task [${task.name}]: ${err}`);
        });
      }, intervalMs);
      this.schedulerRegistry.addInterval(jobName, interval);
      this.logger.log(`Registered Interval [${jobName}]: ${task.intervalSeconds}s`);
    }
  }

  unregisterSchedule(taskId: number): void {
    const jobName = `task-${taskId}`;

    try {
      this.schedulerRegistry.deleteCronJob(jobName);
      this.logger.log(`Unregistered CronJob [${jobName}]`);
    } catch {
      // CronJob not found, ignore
    }

    try {
      this.schedulerRegistry.deleteInterval(jobName);
      this.logger.log(`Unregistered Interval [${jobName}]`);
    } catch {
      // Interval not found, ignore
    }
  }

  private validateTriggerConfig(
    triggerType: 'CRON' | 'INTERVAL',
    cronExpression?: string,
    intervalSeconds?: number,
  ): void {
    if (triggerType === 'CRON') {
      if (!cronExpression) {
        throw new CustomException(ErrorCode.ERR_10001, 'Cron 表达式格式无效');
      }
      try {
        CronExpressionParser.parse(cronExpression);
      } catch {
        throw new CustomException(ErrorCode.ERR_10001, 'Cron 表达式格式无效');
      }
    } else if (triggerType === 'INTERVAL') {
      if (!intervalSeconds || intervalSeconds <= 0) {
        throw new CustomException(ErrorCode.ERR_10001, '间隔时长必须大于 0');
      }
    }
  }
}
