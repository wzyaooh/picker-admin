import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';

/**
 * 密码历史实体
 * 记录用户的历史密码，用于防止密码重复使用
 */
@Entity('password_history')
@Index(['userId', 'createdAt'])
export class PasswordHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '用户ID' })
  userId: number;

  @Column({ length: 255, comment: '密码哈希值' })
  passwordHash: string;

  @Column({ nullable: true, comment: '修改人ID' })
  changedBy: number;

  @Column({ length: 100, nullable: true, comment: '修改原因' })
  changeReason: string;

  @Column({ length: 50, nullable: true, comment: '修改时的IP地址' })
  ipAddress: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '创建时间',
  })
  createdAt: Date;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'userId' })
  user: User;
}
