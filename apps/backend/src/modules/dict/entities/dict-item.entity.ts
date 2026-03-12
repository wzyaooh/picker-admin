import 'reflect-metadata';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Dict } from './dict.entity';

@Entity({ name: 'dict_item' })
@Index('uk_dict_value', ['dictId', 'value'], { unique: true })
export class DictItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ comment: '字典ID' })
  dictId!: number;

  @Column({ length: 100, comment: '字典项标签' })
  label!: string;

  @Column({ length: 100, comment: '字典项值' })
  value!: string;

  @Column({ length: 20, nullable: true, comment: '颜色标签' })
  color?: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description?: string;

  @Column({ type: 'int', default: 0, comment: '排序' })
  sort!: number;

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

  @ManyToOne(() => Dict, (dict) => dict.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dictId' })
  dict?: Dict;
}
