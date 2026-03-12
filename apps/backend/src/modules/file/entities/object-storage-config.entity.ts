import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StorageConfig } from './storage-config.entity';

/**
 * 对象存储配置实体
 */
@Entity('object_storage_config')
export class ObjectStorageConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, comment: '关联的存储配置ID' })
  storageConfigId: number;

  @Column({ length: 255, comment: '对象存储端点' })
  endpoint: string;

  @Column({ length: 100, comment: '访问密钥ID' })
  accessKeyId: string;

  @Column({ length: 255, comment: '访问密钥' })
  secretAccessKey: string;

  @Column({ length: 100, comment: '存储桶名称' })
  bucket: string;

  @Column({ length: 50, nullable: true, comment: '区域' })
  region: string;

  @Column({ default: true, comment: '是否使用SSL' })
  useSSL: boolean;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @OneToOne(() => StorageConfig, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'storageConfigId' })
  storageConfig: StorageConfig;
}
