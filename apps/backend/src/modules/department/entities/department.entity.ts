import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50, comment: '部门编码' })
  code: string;

  @Column({ length: 100, comment: '部门名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '部门描述' })
  description: string;

  @Column({ nullable: true, comment: '父部门ID' })
  parentId: number;

  @Column({ nullable: true, comment: '部门负责人用户ID' })
  leaderId: number;

  @Column({ default: 0, comment: '排序' })
  order: number;

  @Column({ default: true, comment: '是否启用' })
  enable: boolean;

  @CreateDateColumn({ comment: '创建时间' })
  createTime: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updateTime: Date;

  // 自引用关系：父部门
  @ManyToOne(() => Department, (department) => department.children, {
    createForeignKeyConstraints: false,
  })
  parent: Department;

  // 自引用关系：子部门
  @OneToMany(() => Department, (department) => department.parent, {
    createForeignKeyConstraints: false,
  })
  children: Department[];
}
