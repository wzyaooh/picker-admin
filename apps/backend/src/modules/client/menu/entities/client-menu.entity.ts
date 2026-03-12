import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClientModule } from '../../module/entities';

export type MenuType = 'MODULE' | 'CATALOG' | 'MENU' | 'BUTTON';

@Entity('client_menu')
export class ClientMenu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, comment: '模块编码' })
  moduleCode: string;

  @ManyToOne(() => ClientModule, (module) => module.menus, {
    createForeignKeyConstraints: false,
  })
  module: ClientModule;

  @Column({ nullable: true, comment: '父级 ID' })
  parentId: number;

  @ManyToOne(() => ClientMenu, (menu) => menu.children, {
    createForeignKeyConstraints: false,
  })
  parent: ClientMenu;

  @OneToMany(() => ClientMenu, (menu) => menu.parent, {
    createForeignKeyConstraints: false,
  })
  children: ClientMenu[];

  @Column({ length: 50, comment: '显示名称' })
  name: string;

  @Column({
    type: 'enum',
    enum: ['MODULE', 'CATALOG', 'MENU', 'BUTTON'],
    comment: '菜单类型',
  })
  type: MenuType;

  @Column({ length: 200, nullable: true, comment: '路由地址' })
  path: string;

  @Column({ length: 50, nullable: true, comment: '图标' })
  icon: string;

  @Column({ length: 200, nullable: true, comment: '组件路径' })
  component: string;

  @Column({ unique: true, length: 100, comment: '权限标识' })
  code: string;

  @Column({ default: false, comment: '是否隐藏' })
  hidden: boolean;

  @Column({ default: true, comment: '是否启用' })
  enable: boolean;

  @Column({ default: 999, comment: '排序' })
  order: number;

  @CreateDateColumn({ type: 'timestamp', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', comment: '更新时间' })
  updatedAt: Date;
}
