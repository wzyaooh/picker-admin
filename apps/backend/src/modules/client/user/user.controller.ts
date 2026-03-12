import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard, PreviewGuard } from '@/common/guards';
import { Audit } from '@/common/decorators';
import { Roles } from '@/common/decorators/roles.decorator';
import { ClientUserService } from './user.service';
import {
  CreateClientUserDto,
  UpdateClientUserDto,
  QueryClientUserDto,
} from './dto';

@ApiTags('客户端用户')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard)
@Controller('client/user')
export class ClientUserController {
  constructor(private readonly userService: ClientUserService) {}

  @Post()
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '创建客户端用户', saveReqBody: true })
  @ApiOperation({ summary: '创建客户端用户' })
  create(@Body() dto: CreateClientUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @Audit({ description: '查询客户端用户列表' })
  @ApiOperation({ summary: '查询客户端用户列表' })
  findAll(@Query() query: QueryClientUserDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @Audit({ description: '查询客户端用户详情' })
  @ApiOperation({ summary: '查询客户端用户详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '更新客户端用户', saveReqBody: true })
  @ApiOperation({ summary: '更新客户端用户' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientUserDto,
  ) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除客户端用户' })
  @ApiOperation({ summary: '删除客户端用户' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }

  @Patch(':id/toggle')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '切换客户端用户状态' })
  @ApiOperation({ summary: '切换客户端用户启用/禁用' })
  toggleEnabled(@Param('id', ParseIntPipe) id: number) {
    return this.userService.toggleEnabled(id);
  }

  @Patch(':id/reset-password')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '重置客户端用户密码', saveReqBody: true })
  @ApiOperation({ summary: '重置客户端用户密码' })
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body('password') password: string,
  ) {
    return this.userService.resetPassword(id, password);
  }
}
