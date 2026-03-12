import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 安全配置实体
 * 存储安全配置，每组配置一行记录，configGroup 为唯一键
 */
@Entity('security_config')
export class SecurityConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50, comment: '配置分组' })
  configGroup: string;

  @Column({ type: 'json', comment: '配置数据（JSON）' })
  configData: Record<string, any>;

  @Column({ length: 200, nullable: true, comment: '配置描述' })
  description: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
