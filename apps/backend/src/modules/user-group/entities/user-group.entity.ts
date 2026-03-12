import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/modules/user/entities';
import { Permission } from '@/modules/permission/entities';

@Entity('user_group')
export class UserGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50, comment: '用户组编码' })
  code: string;

  @Column({ unique: true, length: 50, comment: '用户组名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description: string;

  @Column({ default: true, comment: '是否启用' })
  enable: boolean;

  @Column({ default: 0, comment: '排序' })
  sort: number;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;

  @ManyToMany(() => User, {
    createForeignKeyConstraints: false,
  })
  @JoinTable({
    name: 'user_group_member',
    joinColumn: { name: 'groupId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  members: User[];

  @ManyToMany(() => Permission, {
    createForeignKeyConstraints: false,
  })
  @JoinTable({
    name: 'user_group_permission',
    joinColumn: { name: 'groupId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions: Permission[];
}
