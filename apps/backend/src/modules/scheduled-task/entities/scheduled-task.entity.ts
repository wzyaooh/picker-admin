import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('scheduled_task')
export class ScheduledTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 64, comment: '任务名称' })
  name: string;

  @Column({ length: 64, comment: '任务组' })
  taskGroup: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '描述' })
  description: string;

  @Column({ type: 'enum', enum: ['CRON', 'INTERVAL'], comment: '触发类型' })
  triggerType: 'CRON' | 'INTERVAL';

  @Column({ length: 64, nullable: true, comment: 'Cron 表达式' })
  cronExpression: string;

  @Column({ type: 'int', nullable: true, comment: '间隔秒数' })
  intervalSeconds: number;

  @Column({ type: 'enum', enum: ['LOCAL', 'HTTP'], comment: '任务类型' })
  taskType: 'LOCAL' | 'HTTP';

  @Column({ length: 200, comment: '执行器名称' })
  handlerName: string;

  @Column({ type: 'text', nullable: true, comment: '任务参数 JSON' })
  taskParams: string;

  @Column({ type: 'enum', enum: ['GET', 'POST', 'PUT', 'DELETE'], nullable: true, default: 'POST', comment: 'HTTP 请求方法' })
  httpMethod: 'DELETE' | 'GET' | 'POST' | 'PUT';

  @Column({ type: 'text', nullable: true, comment: 'HTTP 自定义请求头 JSON' })
  httpHeaders: string;

  @Column({ type: 'enum', enum: ['NONE', 'BEARER', 'BASIC', 'API_KEY'], nullable: true, default: 'NONE', comment: 'HTTP 认证类型' })
  httpAuthType: 'API_KEY' | 'BASIC' | 'BEARER' | 'NONE';

  @Column({ type: 'varchar', length: 500, nullable: true, comment: 'HTTP 认证值' })
  httpAuthValue: string;

  @Column({ type: 'enum', enum: ['DISCARD', 'COVER', 'QUEUE'], default: 'DISCARD', comment: '阻塞策略' })
  blockingStrategy: 'COVER' | 'DISCARD' | 'QUEUE';

  @Column({ type: 'int', default: 0, comment: '超时时间（秒）' })
  timeoutSeconds: number;

  @Column({ type: 'int', default: 0, comment: '最大重试次数' })
  maxRetryCount: number;

  @Column({ type: 'int', default: 0, comment: '重试间隔（秒）' })
  retryInterval: number;

  @Column({ type: 'tinyint', default: 0, comment: '是否启用' })
  enabled: number;

  @Column({ type: 'datetime', nullable: true, comment: '上次执行时间' })
  lastExecuteTime: Date;

  @CreateDateColumn({ type: 'datetime', precision: 6, comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6, comment: '更新时间' })
  updatedAt: Date;
}
