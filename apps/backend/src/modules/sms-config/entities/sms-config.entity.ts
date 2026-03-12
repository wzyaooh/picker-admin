import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 短信配置实体
 * 存储短信服务商配置，支持多个服务商
 */
@Entity('sms_config')
export class SmsConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, comment: '配置名称' })
  name: string;

  @Column({ length: 50, comment: '短信厂商：aliyun/tencent/huawei/other' })
  provider: string;

  @Column({ default: false, comment: '是否为默认配置' })
  isDefault: boolean;

  @Column({ length: 200, comment: 'Access Key' })
  accessKey: string;

  @Column({ length: 200, comment: 'Secret Key' })
  secretKey: string;

  @Column({ length: 100, comment: '短信签名' })
  signName: string;

  @Column({ length: 200, comment: '模板ID' })
  templateId: string;

  @Column({ default: true, comment: '是否启用' })
  enabled: boolean;

  @Column({ type: 'text', nullable: true, comment: '负载均衡配置（JSON）' })
  loadBalanceConfig: string;

  @Column({ default: 60, comment: '重试间隔（秒）' })
  retryInterval: number;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
