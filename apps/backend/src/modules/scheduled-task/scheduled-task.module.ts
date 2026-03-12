import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ScheduledTask, ScheduledTaskLog } from './entities';
import {
  ScheduledTaskController,
  ScheduledTaskLogController,
} from './scheduled-task.controller';
import { ScheduledTaskLogService } from './scheduled-task-log.service';
import { ScheduledTaskService } from './scheduled-task.service';
import { TaskExecutionEngine } from './task-execution.engine';
import { TaskHandlerRegistry } from './task-handler.registry';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledTask, ScheduledTaskLog]),
    DiscoveryModule,
  ],
  controllers: [ScheduledTaskController, ScheduledTaskLogController],
  providers: [
    ScheduledTaskService,
    ScheduledTaskLogService,
    TaskExecutionEngine,
    TaskHandlerRegistry,
  ],
  exports: [ScheduledTaskService, TaskHandlerRegistry],
})
export class ScheduledTaskModule {}
