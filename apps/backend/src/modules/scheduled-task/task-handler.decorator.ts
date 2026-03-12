import { SetMetadata } from '@nestjs/common';

export const TASK_HANDLER_KEY = 'TASK_HANDLER';
export const TaskHandler = (name: string) => SetMetadata(TASK_HANDLER_KEY, name);
