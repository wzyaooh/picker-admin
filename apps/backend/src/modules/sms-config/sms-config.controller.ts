import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { RoleGuard } from '@/common/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { SmsConfigService } from './sms-config.service';
import { CreateSmsConfigDto, UpdateSmsConfigDto, QuerySmsConfigDto } from './dto';

@ApiTags('短信配置')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard, RoleGuard)
@Controller('sms-config')
export class SmsConfigController {
  constructor(private readonly smsConfigService: SmsConfigService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  @Audit({ description: '创建短信配置', saveReqBody: true })
  @ApiOperation({ summary: '创建短信配置' })
  create(@Body() dto: CreateSmsConfigDto) {
    return this.smsConfigService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '查询短信配置列表' })
  findAll(@Query() query: QuerySmsConfigDto) {
    return this.smsConfigService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询短信配置详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.smsConfigService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '更新短信配置', saveReqBody: true })
  @ApiOperation({ summary: '更新短信配置' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSmsConfigDto) {
    return this.smsConfigService.update(id, dto);
  }

  @Patch(':id/toggle')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '切换短信配置启用状态' })
  @ApiOperation({ summary: '切换启用状态' })
  toggleEnabled(@Param('id', ParseIntPipe) id: number) {
    return this.smsConfigService.toggleEnabled(id);
  }

  @Patch(':id/set-default')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '设置默认短信配置' })
  @ApiOperation({ summary: '设置为默认配置' })
  setDefault(@Param('id', ParseIntPipe) id: number) {
    return this.smsConfigService.setDefault(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除短信配置' })
  @ApiOperation({ summary: '删除短信配置' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.smsConfigService.remove(id);
  }
}
