import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 存储配置实体
 */
@Entity('storage_config')
export class StorageConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, comment: '配置名称' })
  name: string;

  @Column({ length: 50, unique: true, nullable: true, comment: '存储编码' })
  code: string;

  @Column({ length: 20, comment: '存储类型：local/object' })
  type: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description: string;

  @Column({ length: 500, nullable: true, comment: '存储路径（本地存储专用）' })
  storagePath: string;

  @Column({ length: 500, nullable: true, comment: '访问路径（本地存储专用）' })
  accessPath: string;

  @Column({ default: true, comment: '是否启用回收站（本地存储专用）' })
  enableRecycleBin: boolean;

  @Column({ length: 255, default: '.RECYCLE.BIN/', nullable: true, comment: '回收站路径（本地存储专用）' })
  recycleBinPath: string;

  @Column({ default: 999, comment: '排序' })
  sort: number;

  @Column({ default: false, comment: '是否为默认存储' })
  isDefault: boolean;

  @Column({ default: true, comment: '是否启用' })
  enabled: boolean;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
