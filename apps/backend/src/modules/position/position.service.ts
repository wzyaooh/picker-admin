import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';

import { CreatePositionDto, QueryPositionDto, UpdatePositionDto } from './dto';
import { Position } from './entities';

/**
 * 岗位服务
 * 提供岗位的增删改查功能
 */
@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
  ) {}

  /**
   * 创建岗位
   * @param dto 岗位创建数据
   * @returns 创建的岗位实体
   */
  async create(dto: CreatePositionDto): Promise<Position> {
    const existing = await this.positionRepo.findOne({
      where: { code: dto.code },
    });

    if (existing) {
      throw new CustomException(ErrorCode.ERR_20001, '岗位编码已存在');
    }

    const position = this.positionRepo.create(dto);
    await this.positionRepo.save(position);
    return position;
  }

  /**
   * 分页查询岗位列表
   * @param query 查询参数
   * @returns 分页数据
   */
  async findAll(query: QueryPositionDto) {
    const pageSize = query.pageSize || 10;
    const pageNo = query.pageNo || 1;

    const queryBuilder = this.positionRepo.createQueryBuilder('position');

    if (query.name) {
      queryBuilder.andWhere('position.name LIKE :name', {
        name: `%${query.name}%`,
      });
    }

    if (query.code) {
      queryBuilder.andWhere('position.code LIKE :code', {
        code: `%${query.code}%`,
      });
    }

    if (query.enable !== undefined) {
      queryBuilder.andWhere('position.enable = :enable', {
        enable: query.enable,
      });
    }

    const [positions, total] = await queryBuilder
      .orderBy('position.sort', 'ASC')
      .addOrderBy('position.id', 'ASC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { pageData: positions, total };
  }

  /**
   * 查询单个岗位
   * @param id 岗位ID
   * @returns 岗位实体
   */
  async findOne(id: number): Promise<Position> {
    const position = await this.positionRepo.findOne({ where: { id } });
    
    if (!position) {
      throw new CustomException(ErrorCode.ERR_20002, '岗位不存在');
    }
    
    return position;
  }

  /**
   * 更新岗位
   * @param id 岗位ID
   * @param dto 更新数据
   * @returns 更新后的岗位实体
   */
  async update(id: number, dto: UpdatePositionDto): Promise<Position> {
    const position = await this.findOne(id);

    if (dto.code && dto.code !== position.code) {
      const existing = await this.positionRepo.findOne({
        where: { code: dto.code },
      });
      
      if (existing) {
        throw new CustomException(ErrorCode.ERR_20001, '岗位编码已存在');
      }
    }

    Object.assign(position, dto);
    await this.positionRepo.save(position);
    return position;
  }

  /**
   * 删除岗位
   * @param id 岗位ID
   * @returns 删除成功返回 true
   */
  async remove(id: number): Promise<boolean> {
    const position = await this.findOne(id);
    await this.positionRepo.remove(position);
    return true;
  }
}
