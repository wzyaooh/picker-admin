import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { File } from './file.entity';
import { User } from '../../user/entities/user.entity';

/**
 * 文件版本实体
 */
@Entity('file_version')
@Index(['fileId'])
export class FileVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '文件ID' })
  fileId: number;

  @Column({ comment: '版本号' })
  version: number;

  @Column({ type: 'bigint', comment: '文件大小（字节）' })
  size: number;

  @Column({ length: 500, comment: '文件存储路径' })
  path: string;

  @Column({ length: 500, comment: '文件访问URL' })
  url: string;

  @Column({ comment: '存储配置ID' })
  storageConfigId: number;

  @Column({ length: 20, comment: '存储类型：local/object' })
  storageType: string;

  @Column({ comment: '创建者ID' })
  createdBy: number;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => File, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'fileId' })
  file: File;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'createdBy' })
  creator: User;
}
