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
import { File } from './file.entity';
import { User } from '../../user/entities/user.entity';

/**
 * 文件分享实体
 */
@Entity('file_share')
@Index(['shareId'], { unique: true })
@Index(['fileId'])
export class FileShare {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 32, unique: true, comment: '分享ID' })
  shareId: string;

  @Column({ comment: '文件ID' })
  fileId: number;

  @Column({ comment: '分享者ID' })
  userId: number;

  @Column({ length: 500, comment: '分享URL' })
  shareUrl: string;

  @Column({ type: 'timestamp', nullable: true, comment: '过期时间' })
  expiresAt: Date;

  @Column({ length: 50, nullable: true, comment: '访问密码' })
  password: string;

  @Column({ default: 0, comment: '访问次数' })
  accessCount: number;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => File, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'fileId' })
  file: File;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'userId' })
  user: User;
}
