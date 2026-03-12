import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsConfig } from './entities';
import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { CreateSmsConfigDto, UpdateSmsConfigDto, QuerySmsConfigDto } from './dto';

@Injectable()
export class SmsConfigService {
  private readonly logger = new Logger(SmsConfigService.name);

  constructor(
    @InjectRepository(SmsConfig)
    private smsConfigRepo: Repository<SmsConfig>,
  ) {}

  async create(dto: CreateSmsConfigDto) {
    if (dto.isDefault) {
      await this.smsConfigRepo.update({ isDefault: true }, { isDefault: false });
    }

    const entity = this.smsConfigRepo.create({
      ...dto,
      isDefault: dto.isDefault || false,
      enabled: dto.enabled !== undefined ? dto.enabled : true,
      retryInterval: dto.retryInterval !== undefined ? dto.retryInterval : 60,
    });

    return this.smsConfigRepo.save(entity);
  }

  async findAll(query: QuerySmsConfigDto) {
    const { keyword, provider, enabled, page = 1, pageSize = 20 } = query;

    const queryBuilder = this.smsConfigRepo.createQueryBuilder('sms');

    if (keyword) {
      queryBuilder.andWhere('sms.name LIKE :keyword', { keyword: `%${keyword}%` });
    }

    if (provider) {
      queryBuilder.andWhere('sms.provider = :provider', { provider });
    }

    if (enabled !== undefined) {
      queryBuilder.andWhere('sms.enabled = :enabled', { enabled });
    }

    queryBuilder.orderBy('sms.isDefault', 'DESC');
    queryBuilder.addOrderBy('sms.createdAt', 'DESC');

    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total, page, pageSize };
  }

  async findOne(id: number) {
    const config = await this.smsConfigRepo.findOne({ where: { id } });
    if (!config) {
      throw new CustomException(ErrorCode.ERR_20002, '短信配置不存在');
    }
    return config;
  }

  async update(id: number, dto: UpdateSmsConfigDto) {
    const config = await this.findOne(id);

    if (dto.isDefault && !config.isDefault) {
      await this.smsConfigRepo.update({ isDefault: true }, { isDefault: false });
    }

    Object.assign(config, dto);
    return this.smsConfigRepo.save(config);
  }

  async remove(id: number) {
    const config = await this.findOne(id);

    if (config.isDefault) {
      throw new CustomException(ErrorCode.ERR_20001, '不允许删除默认短信配置');
    }

    await this.smsConfigRepo.delete(id);
    return true;
  }

  async toggleEnabled(id: number) {
    const config = await this.findOne(id);
    config.enabled = !config.enabled;
    await this.smsConfigRepo.save(config);
    return config;
  }

  async setDefault(id: number) {
    const config = await this.findOne(id);
    await this.smsConfigRepo.update({ isDefault: true }, { isDefault: false });
    config.isDefault = true;
    await this.smsConfigRepo.save(config);
    return config;
  }
}
