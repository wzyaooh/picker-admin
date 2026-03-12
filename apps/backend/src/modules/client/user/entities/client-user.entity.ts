import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('client_user')
export class ClientUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50, comment: '用户名' })
  username: string;

  @Column({ select: false, comment: '密码' })
  password: string;

  @Column({ length: 50, nullable: true, comment: '昵称' })
  nickName: string;

  @Column({ length: 255, nullable: true, comment: '头像URL' })
  avatar: string;

  @Column({ length: 20, nullable: true, comment: '手机号' })
  phone: string;

  @Column({ length: 100, nullable: true, comment: '邮箱' })
  email: string;

  @Column({ type: 'tinyint', nullable: true, comment: '性别：0-女 1-男' })
  gender: number;

  @Column({ length: 50, nullable: true, comment: '所属客户端模块编码' })
  moduleCode: string;

  @Column({ default: true, comment: '是否启用' })
  enabled: boolean;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark: string;

  @CreateDateColumn({ type: 'datetime', precision: 6, comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6, comment: '更新时间' })
  updatedAt: Date;
}
