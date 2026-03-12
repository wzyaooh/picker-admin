import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashSync } from 'bcryptjs';
import {
  CustomException,
  ErrorCode,
} from '@/common/exceptions/custom.exception';
import { ClientUser } from './entities';
import {
  CreateClientUserDto,
  UpdateClientUserDto,
  QueryClientUserDto,
} from './dto';

@Injectable()
export class ClientUserService {
  private readonly logger = new Logger(ClientUserService.name);

  constructor(
    @InjectRepository(ClientUser)
    private readonly userRepo: Repository<ClientUser>,
  ) {}

  async create(dto: CreateClientUserDto): Promise<ClientUser> {
    const existing = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (existing) {
      throw new CustomException(ErrorCode.ERR_20001, '用户名已存在');
    }

    const entity = this.userRepo.create({
      ...dto,
      password: hashSync(dto.password, 10),
      enabled: dto.enabled ?? true,
    });

    return this.userRepo.save(entity);
  }

  async findAll(query: QueryClientUserDto) {
    const { page = 1, pageSize = 10, keyword, enabled, moduleCode } = query;

    const qb = this.userRepo.createQueryBuilder('u');

    if (keyword) {
      qb.andWhere(
        '(u.username LIKE :kw OR u.nickName LIKE :kw OR u.phone LIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    if (enabled !== undefined) {
      qb.andWhere('u.enabled = :enabled', { enabled: !!enabled });
    }

    if (moduleCode) {
      qb.andWhere('u.moduleCode = :moduleCode', { moduleCode });
    }

    const [pageData, total] = await qb
      .orderBy('u.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { pageData, total };
  }

  async findOne(id: number): Promise<ClientUser> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new CustomException(ErrorCode.ERR_20002, '客户端用户不存在');
    }
    return user;
  }

  async update(id: number, dto: UpdateClientUserDto): Promise<ClientUser> {
    await this.findOne(id);

    if (dto.username) {
      const existing = await this.userRepo.findOne({
        where: { username: dto.username },
      });
      if (existing && existing.id !== id) {
        throw new CustomException(ErrorCode.ERR_20001, '用户名已存在');
      }
    }

    const updateData: any = { ...dto };
    if (dto.password) {
      updateData.password = hashSync(dto.password, 10);
    } else {
      delete updateData.password;
    }

    await this.userRepo.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<boolean> {
    await this.findOne(id);
    await this.userRepo.delete(id);
    return true;
  }

  async toggleEnabled(id: number): Promise<boolean> {
    const user = await this.findOne(id);
    await this.userRepo.update(id, { enabled: !user.enabled });
    return true;
  }

  async resetPassword(id: number, newPassword: string): Promise<boolean> {
    await this.findOne(id);
    await this.userRepo.update(id, {
      password: hashSync(newPassword, 10),
    });
    return true;
  }
}
