-- 创建 scheduled_task 表
CREATE TABLE IF NOT EXISTS `scheduled_task` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL COMMENT '任务名称',
  `taskGroup` varchar(64) NOT NULL COMMENT '任务组',
  `description` varchar(200) NULL COMMENT '描述',
  `triggerType` enum('CRON','INTERVAL') NOT NULL COMMENT '触发类型',
  `cronExpression` varchar(64) NULL COMMENT 'Cron 表达式',
  `intervalSeconds` int NULL COMMENT '间隔秒数',
  `taskType` enum('LOCAL','HTTP') NOT NULL COMMENT '任务类型',
  `handlerName` varchar(200) NOT NULL COMMENT '执行器名称',
  `taskParams` text NULL COMMENT '任务参数 JSON',
  `blockingStrategy` enum('DISCARD','COVER','QUEUE') NOT NULL DEFAULT 'DISCARD' COMMENT '阻塞策略',
  `timeoutSeconds` int NOT NULL DEFAULT 0 COMMENT '超时时间（秒）',
  `maxRetryCount` int NOT NULL DEFAULT 0 COMMENT '最大重试次数',
  `retryInterval` int NOT NULL DEFAULT 0 COMMENT '重试间隔（秒）',
  `enabled` tinyint NOT NULL DEFAULT 0 COMMENT '是否启用',
  `lastExecuteTime` datetime NULL COMMENT '上次执行时间',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  UNIQUE KEY `IDX_scheduled_task_name` (`name`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时任务';

-- 创建 scheduled_task_log 表
CREATE TABLE IF NOT EXISTS `scheduled_task_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `taskId` int NOT NULL COMMENT '任务ID',
  `taskName` varchar(64) NOT NULL COMMENT '任务名称',
  `triggeredBy` enum('SCHEDULE','MANUAL') NOT NULL COMMENT '触发方式',
  `startTime` datetime NOT NULL COMMENT '开始时间',
  `endTime` datetime NULL COMMENT '结束时间',
  `durationMs` int NOT NULL DEFAULT 0 COMMENT '耗时（毫秒）',
  `status` enum('SUCCESS','FAIL','TIMEOUT') NOT NULL COMMENT '执行状态',
  `result` text NULL COMMENT '执行结果',
  `errorMessage` text NULL COMMENT '错误信息',
  `retryCount` int NOT NULL DEFAULT 0 COMMENT '实际重试次数',
  INDEX `idx_taskId` (`taskId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_startTime` (`startTime`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时任务执行日志';
