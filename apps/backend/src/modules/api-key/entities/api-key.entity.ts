import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryColumn({ length: 50, comment: 'API Key ID' })
  id: string;

  @Column({ length: 100, unique: true, comment: 'API Key 名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description?: string;

  @Column({ length: 100, comment: 'API Key 前缀（用于显示）' })
  keyPrefix: string;

  @Column({ length: 200, unique: true, comment: '完整的 API Key' })
  fullKey: string;

  @Column({ type: 'json', comment: '权限列表' })
  permissions: string[];

  @Column({ type: 'int', default: 1000, comment: '速率限制（每小时请求数）' })
  rateLimit: number;

  @Column({ type: 'timestamp', nullable: true, comment: '过期时间' })
  expiresAt?: Date | null;

  @Column({ type: 'bigint', default: 0, comment: '使用次数' })
  usageCount: number;

  @Column({ type: 'timestamp', nullable: true, comment: '最后使用时间' })
  lastUsedAt?: Date | null;

  @Column({ default: true, comment: '是否启用' })
  enabled: boolean;

  @Column({ type: 'int', nullable: true, comment: '创建者用户ID' })
  createdBy?: number;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
