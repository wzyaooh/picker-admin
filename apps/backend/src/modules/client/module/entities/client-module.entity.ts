import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClientMenu } from '../../menu/entities';

@Entity('client_module')
export class ClientModule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, comment: '模块名称' })
  name: string;

  @Column({ unique: true, length: 50, comment: '模块编码' })
  code: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description: string;

  @Column({ default: true, comment: '是否启用' })
  enable: boolean;

  @CreateDateColumn({ type: 'timestamp', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', comment: '更新时间' })
  updatedAt: Date;

  @OneToMany(() => ClientMenu, (menu) => menu.module, {
    createForeignKeyConstraints: false,
  })
  menus: ClientMenu[];
}
