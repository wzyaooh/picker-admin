import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

/**
 * 存储配额实体
 */
@Entity('storage_quota')
@Index(['userId'], { unique: true })
export class StorageQuota {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, comment: '用户ID' })
  userId: number;

  @Column({ type: 'bigint', comment: '总配额（字节）' })
  total: number;

  @Column({ type: 'bigint', default: 0, comment: '已使用空间（字节）' })
  used: number;

  @Column({ default: 0, comment: '文件数量' })
  fileCount: number;

  @Column({ default: 0, comment: '文件夹数量' })
  folderCount: number;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'userId' })
  user: User;
}
