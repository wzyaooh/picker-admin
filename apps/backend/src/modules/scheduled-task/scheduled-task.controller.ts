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
import { JwtGuard, RoleGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';

import { ScheduledTaskService } from './scheduled-task.service';
import { ScheduledTaskLogService } from './scheduled-task-log.service';
import { TaskHandlerRegistry } from './task-handler.registry';
import {
  CreateScheduledTaskDto,
  UpdateScheduledTaskDto,
  QueryScheduledTaskDto,
  QueryScheduledTaskLogDto,
} from './dto';

@ApiTags('定时任务')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard, RoleGuard)
@Controller('scheduled-task')
export class ScheduledTaskController {
  constructor(
    private readonly taskService: ScheduledTaskService,
    private readonly handlerRegistry: TaskHandlerRegistry,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN')
  @Audit({ description: '创建定时任务', saveReqBody: true })
  @ApiOperation({ summary: '创建定时任务' })
  create(@Body() dto: CreateScheduledTaskDto) {
    return this.taskService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '查询定时任务列表' })
  findAll(@Query() query: QueryScheduledTaskDto) {
    return this.taskService.findAll(query);
  }

  @Get('handlers')
  @ApiOperation({ summary: '获取已注册的 Handler 列表' })
  getHandlers() {
    return this.handlerRegistry.getAllHandlerNames();
  }

  @Get(':id')
  @ApiOperation({ summary: '查询定时任务详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '更新定时任务', saveReqBody: true })
  @ApiOperation({ summary: '更新定时任务' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduledTaskDto,
  ) {
    return this.taskService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除定时任务' })
  @ApiOperation({ summary: '删除定时任务' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.remove(id);
  }

  @Patch(':id/enable')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '启用定时任务' })
  @ApiOperation({ summary: '启用定时任务' })
  enable(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.enable(id);
  }

  @Patch(':id/disable')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '停用定时任务' })
  @ApiOperation({ summary: '停用定时任务' })
  disable(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.disable(id);
  }

  @Post(':id/trigger')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '手动执行定时任务' })
  @ApiOperation({ summary: '手动触发执行定时任务' })
  trigger(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.trigger(id);
  }
}

@ApiTags('定时任务日志')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard, RoleGuard)
@Controller('scheduled-task-log')
export class ScheduledTaskLogController {
  constructor(private readonly logService: ScheduledTaskLogService) {}

  @Get()
  @ApiOperation({ summary: '查询任务执行日志列表' })
  findAll(@Query() query: QueryScheduledTaskLogDto) {
    return this.logService.findAll(query);
  }

  @Delete('task/:taskId')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除指定任务日志' })
  @ApiOperation({ summary: '删除指定任务的所有执行日志' })
  removeByTaskId(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.logService.removeByTaskId(taskId);
  }

  @Delete('all')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '清空全部任务日志' })
  @ApiOperation({ summary: '清空所有任务执行日志' })
  removeAll() {
    return this.logService.removeAll();
  }
}
