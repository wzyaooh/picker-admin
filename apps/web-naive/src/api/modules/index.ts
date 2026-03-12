// API Key 管理
export * from './api-key';

// 审计日志
export * from './audit';

// 客户端用户
export * from './client-user';

// 客户端
export * from './client';

// 爬虫视频（已删除）

// 爬虫
export * from './crawler';

// 部门
export * from './department';

// 字典
export * from './dict';

// 邮件配置
export * from './email-config';

// 文件管理
export * from './file';

// 菜单（业务）- 避免与 permission 模块冲突
export {
  getMenuTreeApi,
  getModulesApi,
  validateMenuPathApi as validateBusinessMenuPathApi,
} from './menu';

// 权限
export * from './permission';

// 岗位
export * from './position';

// 角色
export * from './role';

// 定时任务 - 避免与 crawler 模块冲突
export {
  getTaskListApi as getScheduledTaskListApi,
  createTaskApi as createScheduledTaskApi,
  updateTaskApi as updateScheduledTaskApi,
  deleteTaskApi as deleteScheduledTaskApi,
  enableTaskApi,
  disableTaskApi,
  triggerTaskApi,
  getHandlersApi,
  getTaskLogsApi,
  deleteTaskLogsApi,
  clearAllLogsApi,
} from './scheduled-task';

// 安全配置
export * from './security-config';

// 短信配置
export * from './sms-config';

// 存储配置
export * from './storage-config';

// 用户组
export * from './user-group';
