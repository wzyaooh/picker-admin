import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'audit_log' })
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64 })
  requestId: string;

  @CreateDateColumn({ name: 'time' })
  time: Date;

  @Column({ type: 'int', default: 0 })
  durationMs: number;

  @Column({ length: 8 })
  method: string;

  @Column({ length: 255 })
  path: string;

  @Column({ length: 128, nullable: true })
  controller?: string;

  @Column({ length: 128, nullable: true })
  handler?: string;

  @Column({ length: 64, nullable: true })
  ip?: string;

  @Column({ length: 255, nullable: true })
  userAgent?: string;

  @Column({ type: 'int', nullable: true })
  userId?: number;

  @Column({ length: 50, nullable: true })
  username?: string;

  @Column({ length: 50, nullable: true })
  currentRoleCode?: string;

  @Column({ length: 100, nullable: true })
  action?: string;

  @Column({ length: 200, nullable: true, comment: '接口中文描述' })
  description?: string;

  @Column({ type: 'tinyint', default: 1 })
  success: number;

  @Column({ type: 'int', nullable: true })
  statusCode?: number;

  @Column({ type: 'int', nullable: true })
  errorCode?: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'text', nullable: true })
  reqQuery?: string;

  @Column({ type: 'text', nullable: true })
  reqParams?: string;

  @Column({ type: 'text', nullable: true })
  reqBody?: string;

  @Column({ type: 'text', nullable: true })
  resBody?: string;
}
