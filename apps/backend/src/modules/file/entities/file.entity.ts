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
import { Folder } from './folder.entity';

/**
 * 文件实体
 */
@Entity('file')
@Index(['userId'])
@Index(['folderId'])
@Index(['isDeleted'])
@Index(['md5'])
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, comment: '文件名' })
  name: string;

  @Column({ length: 255, comment: '原始文件名' })
  originalName: string;

  @Column({ type: 'bigint', comment: '文件大小（字节）' })
  size: number;

  @Column({ length: 100, comment: 'MIME类型' })
  mimeType: string;

  @Column({ length: 50, nullable: true, comment: '文件扩展名' })
  extension?: string;

  @Column({ length: 500, comment: '文件存储路径' })
  path: string;

  @Column({ length: 500, comment: '文件访问URL' })
  url: string;

  @Column({ comment: '存储配置ID' })
  storageConfigId: number;

  @Column({ length: 20, comment: '存储类型：local/object' })
  storageType: string;

  @Column({ nullable: true, comment: '所属文件夹ID' })
  folderId?: number;

  @Column({ comment: '所属用户ID' })
  userId: number;

  @Column({ default: false, comment: '是否为文件夹' })
  isFolder: boolean;

  @Column({ default: false, comment: '是否已删除' })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true, comment: '删除时间' })
  deletedAt?: Date;

  @Column({ default: false, comment: '是否收藏' })
  isFavorite: boolean;

  @Column({ type: 'simple-array', nullable: true, comment: '标签列表' })
  tags: string[];

  @Column({ default: 1, comment: '版本号' })
  version: number;

  @Column({ nullable: true, comment: '父版本ID' })
  parentVersionId?: number;

  @Column({ length: 32, comment: '文件MD5值' })
  md5: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Folder, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'folderId' })
  folder: Folder;
}
