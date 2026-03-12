import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';

import { CreateDepartmentDto, QueryDepartmentDto, UpdateDepartmentDto } from './dto';
import { Department } from './entities';

/**
 * 部门服务
 * 提供部门的增删改查、树形结构等功能
 */
@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  /**
   * 创建部门
   * @param createDepartmentDto 部门创建数据
   * @returns 创建的部门实体
   */
  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    const existing = await this.departmentRepo.findOne({
      where: { code: createDepartmentDto.code },
    });

    if (existing) {
      throw new CustomException(ErrorCode.ERR_20001, '部门编码已存在');
    }

    if (createDepartmentDto.parentId) {
      const parent = await this.departmentRepo.findOne({
        where: { id: createDepartmentDto.parentId },
      });

      if (!parent) {
        throw new CustomException(ErrorCode.ERR_20002, '父部门不存在');
      }
    }

    const department = this.departmentRepo.create(createDepartmentDto);
    return this.departmentRepo.save(department);
  }

  /**
   * 查询所有部门（扁平列表）
   * @param query 查询参数
   * @returns 部门列表
   */
  async findAll(query: QueryDepartmentDto): Promise<Department[]> {
    const queryBuilder = this.departmentRepo.createQueryBuilder('department');

    if (query.name) {
      queryBuilder.andWhere('department.name LIKE :name', {
        name: `%${query.name}%`,
      });
    }

    if (query.enable !== undefined) {
      queryBuilder.andWhere('department.enable = :enable', {
        enable: query.enable,
      });
    }

    return queryBuilder.orderBy('department.order', 'ASC').getMany();
  }

  /**
   * 查询部门树
   * @returns 部门树形结构
   */
  async findTree() {
    const allDepartments = await this.departmentRepo.find({
      order: { order: 'ASC' },
    });

    return this.buildTree(allDepartments, null);
  }

  /**
   * 构建树形结构（递归）
   * @param departments 部门列表
   * @param parentId 父部门ID
   * @returns 树形结构数组
   */
  private buildTree(departments: Department[], parentId: number | null): any[] {
    return departments
      .filter((dept) => dept.parentId === parentId)
      .map((dept) => ({
        id: dept.id,
        code: dept.code,
        name: dept.name,
        description: dept.description,
        parentId: dept.parentId,
        leaderId: dept.leaderId,
        order: dept.order,
        enable: dept.enable,
        createTime: dept.createTime,
        updateTime: dept.updateTime,
        children: this.buildTree(departments, dept.id),
      }));
  }

  /**
   * 查询单个部门
   * @param id 部门ID
   * @returns 部门实体
   */
  async findOne(id: number): Promise<Department> {
    const department = await this.departmentRepo.findOne({
      where: { id },
    });

    if (!department) {
      throw new CustomException(ErrorCode.ERR_20002, '部门不存在');
    }

    return department;
  }

  /**
   * 更新部门
   * @param id 部门ID
   * @param updateDepartmentDto 更新数据
   * @returns 更新后的部门实体
   */
  async update(id: number, updateDepartmentDto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findOne(id);

    if (updateDepartmentDto.code && updateDepartmentDto.code !== department.code) {
      const existing = await this.departmentRepo.findOne({
        where: { code: updateDepartmentDto.code },
      });

      if (existing) {
        throw new CustomException(ErrorCode.ERR_20001, '部门编码已存在');
      }
    }

    if (updateDepartmentDto.parentId !== undefined) {
      if (updateDepartmentDto.parentId === id) {
        throw new CustomException(ErrorCode.ERR_20003, '不能将自己设置为父部门');
      }

      if (updateDepartmentDto.parentId) {
        const parent = await this.departmentRepo.findOne({
          where: { id: updateDepartmentDto.parentId },
        });

        if (!parent) {
          throw new CustomException(ErrorCode.ERR_20002, '父部门不存在');
        }

        const isCircular = await this.checkCircularReference(id, updateDepartmentDto.parentId);
        if (isCircular) {
          throw new CustomException(ErrorCode.ERR_20003, '不能将子部门设置为父部门');
        }
      }
    }

    await this.departmentRepo.update(id, updateDepartmentDto);
    return this.findOne(id);
  }

  /**
   * 检查是否会形成循环引用
   * @param deptId 当前部门ID
   * @param newParentId 新的父部门ID
   * @returns 如果会形成循环引用返回 true
   */
  private async checkCircularReference(deptId: number, newParentId: number): Promise<boolean> {
    let currentId = newParentId;

    while (currentId) {
      if (currentId === deptId) {
        return true;
      }

      const dept = await this.departmentRepo.findOne({
        where: { id: currentId },
      });

      if (!dept || !dept.parentId) {
        break;
      }

      currentId = dept.parentId;
    }

    return false;
  }

  /**
   * 删除部门
   * @param id 部门ID
   * @returns 删除成功返回 true
   */
  async remove(id: number): Promise<boolean> {
    const department = await this.findOne(id);

    const children = await this.departmentRepo.find({
      where: { parentId: id },
    });

    if (children.length > 0) {
      throw new CustomException(ErrorCode.ERR_20003, '该部门下有子部门，无法删除');
    }

    await this.departmentRepo.delete(id);
    return true;
  }

  /**
   * 查询部门的所有子孙部门ID（递归）
   * @param id 部门ID
   * @returns 子孙部门ID数组
   */
  async findDescendantIds(id: number): Promise<number[]> {
    const descendants: number[] = [];
    const children = await this.departmentRepo.find({
      where: { parentId: id },
    });

    for (const child of children) {
      descendants.push(child.id);
      const childDescendants = await this.findDescendantIds(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }
}
