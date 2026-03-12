import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

/**
 * 文件夹实体
 */
@Entity('folder')
@Index(['userId'])
@Index(['parentId'])
@Index(['isDeleted'])
export class Folder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, comment: '文件夹名称' })
  name: string;

  @Column({ nullable: true, comment: '父文件夹ID' })
  parentId?: number;

  @Column({ comment: '所属用户ID' })
  userId: number;

  @Column({ length: 500, comment: '文件夹路径' })
  path: string;

  @Column({ nullable: true, comment: '存储配置ID' })
  storageConfigId?: number;

  @Column({ default: false, comment: '是否已删除' })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true, comment: '删除时间' })
  deletedAt?: Date;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Folder, (folder) => folder.children, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'parentId' })
  parent: Folder;

  @OneToMany(() => Folder, (folder) => folder.parent)
  children: Folder[];
}
