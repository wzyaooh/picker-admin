import 'reflect-metadata';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DictItem } from './dict-item.entity';

@Entity({ name: 'dict' })
export class Dict {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 50, comment: '字典编码' })
  code!: string;

  @Column({ length: 50, comment: '字典名称' })
  name!: string;

  @Column({ type: 'text', nullable: true, comment: '字典描述' })
  description?: string;

  @Column({ type: 'tinyint', default: 1, comment: '是否启用' })
  enable!: number;

  @Column({
    name: 'createTime',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '创建时间',
  })
  createTime!: Date;

  @Column({
    name: 'updateTime',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    comment: '更新时间',
  })
  updateTime!: Date;

  @OneToMany(() => DictItem, (item) => item.dict, {
    cascade: true,
  })
  items?: DictItem[];
}
