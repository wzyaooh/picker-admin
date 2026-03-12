import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('scheduled_task_log')
export class ScheduledTaskLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: '任务ID' })
  taskId: number;

  @Column({ length: 64, comment: '任务名称' })
  taskName: string;

  @Column({ type: 'enum', enum: ['SCHEDULE', 'MANUAL'], comment: '触发方式' })
  triggeredBy: 'MANUAL' | 'SCHEDULE';

  @Column({ type: 'datetime', comment: '开始时间' })
  startTime: Date;

  @Column({ type: 'datetime', nullable: true, comment: '结束时间' })
  endTime: Date;

  @Column({ type: 'int', default: 0, comment: '耗时（毫秒）' })
  durationMs: number;

  @Column({ type: 'enum', enum: ['SUCCESS', 'FAIL', 'TIMEOUT'], comment: '执行状态' })
  status: 'FAIL' | 'SUCCESS' | 'TIMEOUT';

  @Column({ type: 'text', nullable: true, comment: '执行结果' })
  result: string;

  @Column({ type: 'text', nullable: true, comment: '错误信息' })
  errorMessage: string;

  @Column({ type: 'int', default: 0, comment: '实际重试次数' })
  retryCount: number;
}
