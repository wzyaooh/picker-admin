import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class PasswordHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '用户ID' })
  userId: number;

  @Column({ select: false, comment: '加密后的密码' })
  passwordHash: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @ManyToOne(() => User, {
    createForeignKeyConstraints: false,
  })
  user: User;
}
