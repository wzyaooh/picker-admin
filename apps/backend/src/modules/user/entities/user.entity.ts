import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Profile } from './profile.entity';
import { Role } from '@/modules/role/entities';
import { Department } from '@/modules/department/entities';
import { Position } from '@/modules/position/entities';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ select: false })
  password: string;

  @Column({ default: true })
  enable: boolean;

  @Column({ nullable: true, comment: '部门ID' })
  departmentId: number;

  @Column({ nullable: true, comment: '岗位ID' })
  positionId: number;

  @Column({ nullable: true, comment: '密码最后修改时间' })
  passwordUpdatedAt: Date;

  @Column({ default: false, comment: '是否必须修改密码' })
  mustChangePassword: boolean;

  @Column({ nullable: true, comment: '最后登录时间' })
  lastLoginAt: Date;

  @Column({ nullable: true, length: 50, comment: '最后登录IP' })
  lastLoginIp: string;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;

  @OneToOne(() => Profile, (profile) => profile.user, {
    createForeignKeyConstraints: false,
    cascade: true,
  })
  profile: Profile;

  @ManyToMany(() => Role, (role) => role.users, {
    createForeignKeyConstraints: false,
  })
  @JoinTable({
    name: 'user_role', // 自定义中间表名称
    joinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'roleId',
      referencedColumnName: 'id',
    },
  })
  roles: Role[];

  @ManyToOne(() => Department, {
    createForeignKeyConstraints: false,
  })
  department: Department;

  @ManyToOne(() => Position, {
    createForeignKeyConstraints: false,
  })
  position: Position;
}
