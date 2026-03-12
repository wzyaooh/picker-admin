/**********************************
 * Picker Admin 数据库初始化脚本
 * @LastEditTime: 2026-02-17
 * @Description: 完整的数据库结构和初始数据（已添加表和字段注释）
 **********************************/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ========================================
-- 表结构定义
-- ========================================

-- ----------------------------
-- Table structure for api_keys
-- ----------------------------
DROP TABLE IF EXISTS `api_keys`;
CREATE TABLE `api_keys` (
  `id` varchar(50) NOT NULL COMMENT 'API Key ID',
  `name` varchar(100) NOT NULL COMMENT 'API Key 名称',
  `description` text COMMENT '描述',
  `keyPrefix` varchar(100) NOT NULL COMMENT 'API Key 前缀（用于显示）',
  `fullKey` varchar(200) NOT NULL COMMENT '完整的 API Key',
  `permissions` json NOT NULL COMMENT '权限列表',
  `rateLimit` int NOT NULL DEFAULT '1000' COMMENT '速率限制（每小时请求数）',
  `expiresAt` timestamp NULL DEFAULT NULL COMMENT '过期时间',
  `usageCount` bigint NOT NULL DEFAULT '0' COMMENT '使用次数',
  `lastUsedAt` timestamp NULL DEFAULT NULL COMMENT '最后使用时间',
  `enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `createdBy` int DEFAULT NULL COMMENT '创建者用户ID',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_5457f77c4528c36c3d810bf6b7` (`name`),
  UNIQUE KEY `IDX_ab426d1d29dd4d5cd6a65b1265` (`fullKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='API密钥管理表';

-- ----------------------------
-- Table structure for audit_log
-- ----------------------------
DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE `audit_log` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `requestId` varchar(64) NOT NULL COMMENT '请求唯一标识',
  `time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '请求时间',
  `durationMs` int NOT NULL DEFAULT '0' COMMENT '请求耗时（毫秒）',
  `method` varchar(8) NOT NULL COMMENT 'HTTP请求方法',
  `path` varchar(255) NOT NULL COMMENT '请求路径',
  `controller` varchar(128) DEFAULT NULL COMMENT '控制器名称',
  `handler` varchar(128) DEFAULT NULL COMMENT '处理方法名称',
  `ip` varchar(64) DEFAULT NULL COMMENT '客户端IP地址',
  `userAgent` varchar(255) DEFAULT NULL COMMENT '用户代理信息',
  `userId` int DEFAULT NULL COMMENT '用户ID',
  `username` varchar(50) DEFAULT NULL COMMENT '用户名',
  `currentRoleCode` varchar(50) DEFAULT NULL COMMENT '当前角色编码',
  `action` varchar(100) DEFAULT NULL COMMENT '操作动作',
  `success` tinyint NOT NULL DEFAULT '1' COMMENT '是否成功（1:成功 0:失败）',
  `statusCode` int DEFAULT NULL COMMENT 'HTTP状态码',
  `errorCode` int DEFAULT NULL COMMENT '错误码',
  `errorMessage` text COMMENT '错误信息',
  `reqQuery` text COMMENT '请求查询参数',
  `reqParams` text COMMENT '请求路径参数',
  `reqBody` text COMMENT '请求体内容',
  `resBody` text COMMENT '响应体内容',
  `description` varchar(200) DEFAULT NULL COMMENT '接口中文描述',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6647 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='审计日志表';

-- ----------------------------
-- Table structure for client_menu
-- ----------------------------
DROP TABLE IF EXISTS `client_menu`;
CREATE TABLE `client_menu` (
  `id` int NOT NULL AUTO_INCREMENT,
  `moduleCode` varchar(50) NOT NULL COMMENT '模块编码',
  `parentId` int DEFAULT NULL COMMENT '父级 ID',
  `name` varchar(50) NOT NULL COMMENT '显示名称',
  `path` varchar(200) DEFAULT NULL COMMENT '路由地址',
  `component` varchar(200) DEFAULT NULL COMMENT '组件路径',
  `code` varchar(100) NOT NULL COMMENT '权限标识',
  `hidden` tinyint NOT NULL DEFAULT '0' COMMENT '是否隐藏',
  `enable` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `order` int NOT NULL DEFAULT '999' COMMENT '排序',
  `moduleId` int DEFAULT NULL,
  `type` enum('MODULE','CATALOG','MENU','BUTTON') NOT NULL COMMENT '菜单类型',
  `icon` varchar(50) DEFAULT NULL COMMENT '图标',
  `createdAt` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_e5fd67025dcab51779b3b5af50` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户端菜单表';

-- ----------------------------
-- Table structure for client_module
-- ----------------------------
DROP TABLE IF EXISTS `client_module`;
CREATE TABLE `client_module` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT '模块名称',
  `code` varchar(50) NOT NULL COMMENT '模块编码',
  `description` text COMMENT '描述',
  `enable` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `createdAt` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_71d10a6eca32b09dad000f3e7a` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户端模块表';

-- ----------------------------
-- Table structure for department
-- ----------------------------
DROP TABLE IF EXISTS `department`;
CREATE TABLE `department` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL COMMENT '部门编码',
  `name` varchar(100) NOT NULL COMMENT '部门名称',
  `description` text COMMENT '部门描述',
  `parentId` int DEFAULT NULL COMMENT '父部门ID',
  `leaderId` int DEFAULT NULL COMMENT '部门负责人用户ID',
  `order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `enable` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `createTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updateTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_62690f4fe31da9eb824d909285` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='部门表';

-- ----------------------------
-- Table structure for dict
-- ----------------------------
DROP TABLE IF EXISTS `dict`;
CREATE TABLE `dict` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL COMMENT '字典编码',
  `name` varchar(50) NOT NULL COMMENT '字典名称',
  `description` text COMMENT '字典描述',
  `enable` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_23291bed5f36bf00b7bfac10ec` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='数据字典表';

-- ----------------------------
-- Table structure for dict_item
-- ----------------------------
DROP TABLE IF EXISTS `dict_item`;
CREATE TABLE `dict_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dictId` int NOT NULL COMMENT '字典ID',
  `label` varchar(100) NOT NULL COMMENT '字典项标签',
  `value` varchar(100) NOT NULL COMMENT '字典项值',
  `color` varchar(20) DEFAULT NULL COMMENT '颜色标签',
  `description` text COMMENT '描述',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `enable` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_value` (`dictId`,`value`),
  CONSTRAINT `FK_0178cbbb7698ca80261c7b6b623` FOREIGN KEY (`dictId`) REFERENCES `dict` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='数据字典项表';

-- ----------------------------
-- Table structure for file
-- ----------------------------
DROP TABLE IF EXISTS `file`;
CREATE TABLE `file` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT '文件名',
  `originalName` varchar(255) NOT NULL COMMENT '原始文件名',
  `size` bigint NOT NULL COMMENT '文件大小（字节）',
  `mimeType` varchar(100) NOT NULL COMMENT 'MIME类型',
  `extension` varchar(50) DEFAULT NULL COMMENT '文件扩展名',
  `path` varchar(500) NOT NULL COMMENT '文件存储路径',
  `url` varchar(500) NOT NULL COMMENT '文件访问URL',
  `storageConfigId` int NOT NULL COMMENT '存储配置ID',
  `storageType` varchar(20) NOT NULL COMMENT '存储类型：local/object',
  `folderId` int DEFAULT NULL COMMENT '所属文件夹ID',
  `userId` int NOT NULL COMMENT '所属用户ID',
  `isFolder` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否为文件夹',
  `isDeleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已删除',
  `deletedAt` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  `isFavorite` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否收藏',
  `tags` text COMMENT '标签列表',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号',
  `parentVersionId` int DEFAULT NULL COMMENT '父版本ID',
  `md5` varchar(32) NOT NULL COMMENT '文件MD5值',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `IDX_66027a8bd3581665d9202f9afb` (`md5`),
  KEY `IDX_2d6cfe90e673c66f374e5bfcb4` (`isDeleted`),
  KEY `IDX_3563fb0d3e9557359f541ac77d` (`folderId`),
  KEY `IDX_b2d8e683f020f61115edea206b` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='文件表';

-- ----------------------------
-- Table structure for file_share
-- ----------------------------
DROP TABLE IF EXISTS `file_share`;
CREATE TABLE `file_share` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shareId` varchar(32) NOT NULL COMMENT '分享ID',
  `fileId` int NOT NULL COMMENT '文件ID',
  `userId` int NOT NULL COMMENT '分享者ID',
  `shareUrl` varchar(500) NOT NULL COMMENT '分享URL',
  `expiresAt` timestamp NULL DEFAULT NULL COMMENT '过期时间',
  `password` varchar(50) DEFAULT NULL COMMENT '访问密码',
  `accessCount` int NOT NULL DEFAULT '0' COMMENT '访问次数',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_420d8e1091e1de7aba44bb8fe1` (`shareId`),
  KEY `IDX_3ce70f15ab03f8e934f17cb166` (`fileId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='文件分享表';

-- ----------------------------
-- Table structure for file_version
-- ----------------------------
DROP TABLE IF EXISTS `file_version`;
CREATE TABLE `file_version` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fileId` int NOT NULL COMMENT '文件ID',
  `version` int NOT NULL COMMENT '版本号',
  `size` bigint NOT NULL COMMENT '文件大小（字节）',
  `path` varchar(500) NOT NULL COMMENT '文件存储路径',
  `url` varchar(500) NOT NULL COMMENT '文件访问URL',
  `storageConfigId` int NOT NULL COMMENT '存储配置ID',
  `storageType` varchar(20) NOT NULL COMMENT '存储类型：local/object',
  `createdBy` int NOT NULL COMMENT '创建者ID',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `IDX_53ba333ae1cdab96cfe44635cf` (`fileId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='文件版本表';

-- ----------------------------
-- Table structure for folder
-- ----------------------------
DROP TABLE IF EXISTS `folder`;
CREATE TABLE `folder` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT '文件夹名称',
  `parentId` int DEFAULT NULL COMMENT '父文件夹ID',
  `userId` int NOT NULL COMMENT '所属用户ID',
  `path` varchar(500) NOT NULL COMMENT '文件夹路径',
  `isDeleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已删除',
  `deletedAt` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `storageConfigId` int DEFAULT NULL COMMENT '存储配置ID',
  PRIMARY KEY (`id`),
  KEY `IDX_42bde96d9b36bbc2a1ca3ee718` (`isDeleted`),
  KEY `IDX_9ee3bd0f189fb242d488c0dfa3` (`parentId`),
  KEY `IDX_a0ef64d088bc677d66b9231e90` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='文件夹表';

-- ----------------------------
-- Table structure for migrations
-- ----------------------------
DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `timestamp` bigint NOT NULL COMMENT '迁移时间戳',
  `name` varchar(255) NOT NULL COMMENT '迁移文件名称',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='数据库迁移记录表';

-- ----------------------------
-- Table structure for object_storage_config
-- ----------------------------
DROP TABLE IF EXISTS `object_storage_config`;
CREATE TABLE `object_storage_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `storageConfigId` int NOT NULL COMMENT '关联的存储配置ID',
  `endpoint` varchar(255) NOT NULL COMMENT '对象存储端点',
  `accessKeyId` varchar(100) NOT NULL COMMENT '访问密钥ID',
  `secretAccessKey` varchar(255) NOT NULL COMMENT '访问密钥',
  `bucket` varchar(100) NOT NULL COMMENT '存储桶名称',
  `region` varchar(50) DEFAULT NULL COMMENT '区域',
  `useSSL` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否使用SSL',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_2af87746f8ce96b81c083a30b6` (`storageConfigId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='对象存储配置表';

-- ----------------------------
-- Table structure for permission
-- ----------------------------
DROP TABLE IF EXISTS `permission`;
CREATE TABLE `permission` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '权限名称',
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '权限编码',
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '权限类型：MODULE/CATALOG/MENU/BUTTON/API',
  `parentId` int DEFAULT NULL COMMENT '父权限ID',
  `path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '路由路径',
  `redirect` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '重定向路径',
  `icon` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '图标',
  `component` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '组件路径',
  `layout` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '布局类型',
  `keepAlive` tinyint DEFAULT NULL COMMENT '是否缓存页面',
  `method` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'HTTP请求方法',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '描述',
  `show` tinyint NOT NULL DEFAULT '1' COMMENT '是否展示在页面菜单',
  `enable` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `order` int DEFAULT NULL COMMENT '排序',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `IDX_30e166e8c6359970755c5727a2` (`code`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1235 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC COMMENT='权限表';

-- ----------------------------
-- Table structure for position
-- ----------------------------
DROP TABLE IF EXISTS `position`;
CREATE TABLE `position` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL COMMENT '岗位编码',
  `name` varchar(100) NOT NULL COMMENT '岗位名称',
  `description` text COMMENT '岗位描述',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `enable` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `createTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updateTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_01e858cf7d6aa6b8f738b14997` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='岗位表';

-- ----------------------------
-- Table structure for profile
-- ----------------------------
DROP TABLE IF EXISTS `profile`;
CREATE TABLE `profile` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `gender` int DEFAULT NULL COMMENT '性别：0-女 1-男',
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif?imageView2/1/w/80/h/80' COMMENT '头像URL',
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '地址',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '邮箱',
  `userId` int NOT NULL COMMENT '用户ID',
  `nickName` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '昵称',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `IDX_a24972ebd73b106250713dcddd` (`userId`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC COMMENT='用户资料表';

-- ----------------------------
-- Table structure for role
-- ----------------------------
DROP TABLE IF EXISTS `role`;
CREATE TABLE `role` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '角色编码',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '角色名称',
  `enable` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `description` text COLLATE utf8mb4_general_ci COMMENT '角色描述',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `IDX_ee999bb389d7ac0fd967172c41` (`code`) USING BTREE,
  UNIQUE KEY `IDX_ae4578dcaed5adff96595e6166` (`name`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC COMMENT='角色表';

-- ----------------------------
-- Table structure for role_permission
-- ----------------------------
DROP TABLE IF EXISTS `role_permission`;
CREATE TABLE `role_permission` (
  `roleId` int NOT NULL COMMENT '角色ID',
  `permissionId` int NOT NULL COMMENT '权限ID',
  PRIMARY KEY (`roleId`,`permissionId`),
  KEY `IDX_e3130a39c1e4a740d044e68573` (`roleId`),
  KEY `IDX_72e80be86cab0e93e67ed1a7a9` (`permissionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色权限关联表';

-- ----------------------------
-- Table structure for storage_config
-- ----------------------------
DROP TABLE IF EXISTS `storage_config`;
CREATE TABLE `storage_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '配置名称',
  `type` varchar(20) NOT NULL COMMENT '存储类型：local/object',
  `description` text COMMENT '描述',
  `isDefault` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否为默认存储',
  `enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `code` varchar(50) DEFAULT NULL COMMENT '存储编码',
  `storagePath` varchar(500) DEFAULT NULL COMMENT '存储路径（本地存储专用）',
  `accessPath` varchar(500) DEFAULT NULL COMMENT '访问路径（本地存储专用）',
  `enableRecycleBin` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用回收站（本地存储专用）',
  `recycleBinPath` varchar(255) DEFAULT '.RECYCLE.BIN/' COMMENT '回收站路径（本地存储专用）',
  `sort` int NOT NULL DEFAULT '999' COMMENT '排序',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_4513cc34ec3f4669aee7d9eb49` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='存储配置表';

-- ----------------------------
-- Table structure for storage_quota
-- ----------------------------
DROP TABLE IF EXISTS `storage_quota`;
CREATE TABLE `storage_quota` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL COMMENT '用户ID',
  `total` bigint NOT NULL COMMENT '总配额（字节）',
  `used` bigint NOT NULL DEFAULT '0' COMMENT '已使用空间（字节）',
  `fileCount` int NOT NULL DEFAULT '0' COMMENT '文件数量',
  `folderCount` int NOT NULL DEFAULT '0' COMMENT '文件夹数量',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_ea20d6dcce6d5b72ebbb9ca1ea` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='存储配额表';

-- ----------------------------
-- Table structure for sms_config
-- ----------------------------
DROP TABLE IF EXISTS `sms_config`;
CREATE TABLE `sms_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '配置名称',
  `provider` varchar(50) NOT NULL COMMENT '短信厂商',
  `isDefault` tinyint NOT NULL DEFAULT '0' COMMENT '是否为默认配置',
  `accessKey` varchar(200) NOT NULL COMMENT 'Access Key',
  `secretKey` varchar(200) NOT NULL COMMENT 'Secret Key',
  `signName` varchar(100) NOT NULL COMMENT '短信签名',
  `templateId` varchar(200) NOT NULL COMMENT '模板ID',
  `enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `loadBalanceConfig` text COMMENT '负载均衡配置（JSON）',
  `retryInterval` int NOT NULL DEFAULT '60' COMMENT '重试间隔（秒）',
  `remark` text COMMENT '备注',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='短信配置表';

-- ----------------------------
-- Table structure for scheduled_task
-- ----------------------------
DROP TABLE IF EXISTS `scheduled_task`;
CREATE TABLE `scheduled_task` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL COMMENT '任务名称',
  `taskGroup` varchar(64) NOT NULL COMMENT '任务组',
  `description` varchar(200) DEFAULT NULL COMMENT '描述',
  `triggerType` enum('CRON','INTERVAL') NOT NULL COMMENT '触发类型',
  `cronExpression` varchar(64) DEFAULT NULL COMMENT 'Cron 表达式',
  `intervalSeconds` int DEFAULT NULL COMMENT '间隔秒数',
  `taskType` enum('LOCAL','HTTP') NOT NULL COMMENT '任务类型',
  `handlerName` varchar(200) NOT NULL COMMENT '执行器名称',
  `taskParams` text COMMENT '任务参数 JSON',
  `httpMethod` enum('GET','POST','PUT','DELETE') DEFAULT 'POST' COMMENT 'HTTP 请求方法',
  `httpHeaders` text COMMENT 'HTTP 自定义请求头 JSON',
  `httpAuthType` enum('NONE','BEARER','BASIC','API_KEY') DEFAULT 'NONE' COMMENT 'HTTP 认证类型',
  `httpAuthValue` varchar(500) DEFAULT NULL COMMENT 'HTTP 认证值',
  `blockingStrategy` enum('DISCARD','COVER','QUEUE') NOT NULL DEFAULT 'DISCARD' COMMENT '阻塞策略',
  `timeoutSeconds` int NOT NULL DEFAULT '0' COMMENT '超时时间（秒）',
  `maxRetryCount` int NOT NULL DEFAULT '0' COMMENT '最大重试次数',
  `retryInterval` int NOT NULL DEFAULT '0' COMMENT '重试间隔（秒）',
  `enabled` tinyint NOT NULL DEFAULT '0' COMMENT '是否启用',
  `lastExecuteTime` datetime DEFAULT NULL COMMENT '上次执行时间',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_scheduled_task_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='定时任务表';

-- ----------------------------
-- Table structure for scheduled_task_log
-- ----------------------------
DROP TABLE IF EXISTS `scheduled_task_log`;
CREATE TABLE `scheduled_task_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `taskId` int NOT NULL COMMENT '任务ID',
  `taskName` varchar(64) NOT NULL COMMENT '任务名称',
  `triggeredBy` enum('SCHEDULE','MANUAL') NOT NULL COMMENT '触发方式',
  `startTime` datetime NOT NULL COMMENT '开始时间',
  `endTime` datetime DEFAULT NULL COMMENT '结束时间',
  `durationMs` int NOT NULL DEFAULT '0' COMMENT '耗时（毫秒）',
  `status` enum('SUCCESS','FAIL','TIMEOUT') NOT NULL COMMENT '执行状态',
  `result` text COMMENT '执行结果',
  `errorMessage` text COMMENT '错误信息',
  `retryCount` int NOT NULL DEFAULT '0' COMMENT '实际重试次数',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='定时任务执行日志表';

-- ----------------------------
-- Table structure for client_user
-- ----------------------------
DROP TABLE IF EXISTS `client_user`;
CREATE TABLE `client_user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `password` varchar(255) NOT NULL COMMENT '密码',
  `nickName` varchar(50) DEFAULT NULL COMMENT '昵称',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像URL',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `gender` tinyint DEFAULT NULL COMMENT '性别：0-女 1-男',
  `moduleCode` varchar(50) DEFAULT NULL COMMENT '所属客户端模块编码',
  `enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `remark` text COMMENT '备注',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_client_user_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户端用户表';

-- ----------------------------
-- Table structure for password_history
-- ----------------------------
DROP TABLE IF EXISTS `password_history`;
CREATE TABLE `password_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL COMMENT '用户ID',
  `passwordHash` varchar(255) NOT NULL COMMENT '密码哈希值',
  `changedBy` int DEFAULT NULL COMMENT '修改人ID',
  `changeReason` varchar(100) DEFAULT NULL COMMENT '修改原因',
  `ipAddress` varchar(50) DEFAULT NULL COMMENT '修改时的IP地址',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `IDX_PASSWORD_HISTORY_USER_CREATED` (`userId`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='密码历史表';

-- ----------------------------
-- Table structure for security_config
-- ----------------------------
DROP TABLE IF EXISTS `security_config`;
CREATE TABLE `security_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `configGroup` varchar(50) NOT NULL COMMENT '配置分组',
  `configData` json NOT NULL COMMENT '配置数据（JSON）',
  `description` varchar(200) DEFAULT NULL COMMENT '配置描述',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  UNIQUE KEY `IDX_security_config_configGroup` (`configGroup`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='安全配置表';

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '用户名',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '密码（加密）',
  `enable` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `createTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updateTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `departmentId` int DEFAULT NULL COMMENT '部门ID',
  `positionId` int DEFAULT NULL COMMENT '岗位ID',
  `passwordUpdatedAt` datetime DEFAULT NULL COMMENT '密码最后修改时间',
  `mustChangePassword` tinyint NOT NULL DEFAULT '0' COMMENT '是否必须修改密码',
  `lastLoginAt` datetime DEFAULT NULL COMMENT '最后登录时间',
  `lastLoginIp` varchar(50) DEFAULT NULL COMMENT '最后登录IP',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `IDX_78a916df40e02a9deb1c4b75ed` (`username`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC COMMENT='用户表';

-- ----------------------------
-- Table structure for user_group
-- ----------------------------
DROP TABLE IF EXISTS `user_group`;
CREATE TABLE `user_group` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `code` varchar(50) NOT NULL COMMENT '用户组编码',
  `name` varchar(50) NOT NULL COMMENT '用户组名称',
  `description` text COMMENT '描述',
  `enable` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `createTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updateTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_a4e957c2cd4a31951d6d656d8b` (`code`),
  UNIQUE KEY `IDX_11b85d8d72220e3ca816d3e907` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户组表';

-- ----------------------------
-- Table structure for user_group_member
-- ----------------------------
DROP TABLE IF EXISTS `user_group_member`;
CREATE TABLE `user_group_member` (
  `groupId` int NOT NULL COMMENT '用户组ID',
  `userId` int NOT NULL COMMENT '用户ID',
  PRIMARY KEY (`groupId`,`userId`),
  KEY `IDX_73675e1d65a5bf3f7e4bff7d4d` (`groupId`),
  KEY `IDX_d573dcdef93033accde5ab32be` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户组成员关联表';

-- ----------------------------
-- Table structure for user_group_permission
-- ----------------------------
DROP TABLE IF EXISTS `user_group_permission`;
CREATE TABLE `user_group_permission` (
  `groupId` int NOT NULL COMMENT '用户组ID',
  `permissionId` int NOT NULL COMMENT '权限ID',
  PRIMARY KEY (`groupId`,`permissionId`),
  KEY `IDX_6fe5fa227f30e5500c1a237a78` (`groupId`),
  KEY `IDX_d6f515f9f0fb9bdc6d93f5129e` (`permissionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户组权限关联表';

-- ----------------------------
-- Table structure for user_role
-- ----------------------------
DROP TABLE IF EXISTS `user_role`;
CREATE TABLE `user_role` (
  `userId` int NOT NULL COMMENT '用户ID',
  `roleId` int NOT NULL COMMENT '角色ID',
  PRIMARY KEY (`userId`,`roleId`),
  KEY `IDX_ab40a6f0cd7d3ebfcce082131f` (`userId`),
  KEY `IDX_dba55ed826ef26b5b22bd39409` (`roleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户角色关联表';

-- ========================================
-- 初始数据
-- ========================================

-- ----------------------------
-- ----------------------------
-- Records of audit_log (empty)
-- ----------------------------

-- Records of client_menu
-- ----------------------------
INSERT INTO `client_menu` (`id`, `moduleCode`, `parentId`, `name`, `path`, `component`, `code`, `hidden`, `enable`, `order`, `moduleId`, `type`, `icon`, `createdAt`, `updatedAt`) VALUES
(23, 'CLIENT', 5, '客户列表', '/client/list', 'Layout', 'client:list', 0, 1, 1, NULL, 'CATALOG', 'mdi:account-group', '2026-02-04 09:57:48', '2026-02-04 09:57:48'),
(24, 'CLIENT', 5, '客户设置', '/client/settings', 'Layout', 'client:settings', 0, 1, 2, NULL, 'CATALOG', 'mdi:cog', '2026-02-04 09:57:48', '2026-02-04 09:57:48'),
(25, 'ORDER', 6, '订单列表', '/order/list', 'Layout', 'order:list', 0, 1, 1, NULL, 'CATALOG', 'mdi:file-document-multiple', '2026-02-04 09:57:48', '2026-02-04 10:18:45'),
(26, 'CLIENT', 23, '客户管理', '/client/list/manage', '/client/manage/index', 'client:list:manage', 0, 1, 1, NULL, 'MENU', 'mdi:account-edit', '2026-02-04 09:57:48', '2026-02-04 09:57:48'),
(27, 'CLIENT', 23, '客户详情', '/client/list/detail', '/client/detail/index', 'client:list:detail', 0, 1, 2, NULL, 'MENU', 'mdi:account-details', '2026-02-04 09:57:48', '2026-02-04 09:57:48'),
(28, 'CLIENT', 24, '基础配置', '/client/settings/config', '/client/config/index', 'client:settings:config', 0, 1, 1, NULL, 'MENU', 'mdi:cog-outline', '2026-02-04 09:57:48', '2026-02-04 09:57:48'),
(29, 'ORDER', 25, '订单管理', '/order/list/manage', '/order/manage/index', 'order:list:manage', 0, 1, 1, NULL, 'MENU', 'mdi:file-document-edit', '2026-02-04 09:57:48', '2026-02-04 09:57:48'),
(30, 'CLIENT', 26, '新增', NULL, NULL, 'client:list:manage:create', 0, 1, 1, NULL, 'BUTTON', NULL, '2026-02-04 09:57:49', '2026-02-04 09:57:49'),
(31, 'CLIENT', 26, '编辑', NULL, NULL, 'client:list:manage:update', 0, 1, 2, NULL, 'BUTTON', NULL, '2026-02-04 09:57:49', '2026-02-04 09:57:49'),
(32, 'CLIENT', 26, '删除', NULL, NULL, 'client:list:manage:delete', 0, 1, 3, NULL, 'BUTTON', NULL, '2026-02-04 09:57:49', '2026-02-04 09:57:49'),
(33, 'CLIENT', 26, '查看', NULL, NULL, 'client:list:manage:view', 0, 1, 4, NULL, 'BUTTON', NULL, '2026-02-04 09:57:49', '2026-02-04 09:57:49'),
(34, 'ORDER', 29, '新增', NULL, NULL, 'order:list:manage:create', 0, 1, 1, NULL, 'BUTTON', NULL, '2026-02-04 09:57:49', '2026-02-04 09:57:49'),
(35, 'ORDER', 29, '编辑', NULL, NULL, 'order:list:manage:update', 0, 1, 2, NULL, 'BUTTON', NULL, '2026-02-04 09:57:49', '2026-02-04 09:57:49'),
(36, 'ORDER', 29, '删除', NULL, NULL, 'order:list:manage:delete', 0, 1, 3, NULL, 'BUTTON', NULL, '2026-02-04 09:57:49', '2026-02-04 09:57:49'),
(37, 'ORDER', 29, '导出', NULL, NULL, 'order:list:manage:export', 0, 1, 4, NULL, 'BUTTON', NULL, '2026-02-04 09:57:49', '2026-02-04 09:57:49');

-- ----------------------------
-- Records of client_module
-- ----------------------------
INSERT INTO `client_module` (`id`, `name`, `code`, `description`, `enable`, `createdAt`, `updatedAt`) VALUES
(5, '客户管理', 'CLIENT', '客户信息管理模块', 1, '2026-02-04 09:57:48', '2026-02-04 09:57:48'),
(6, '订单管理', 'ORDER', '订单信息管理模块', 1, '2026-02-04 09:57:48', '2026-02-04 09:57:48');

-- ----------------------------
-- Records of department
-- ----------------------------
INSERT INTO `department` (`id`, `code`, `name`, `description`, `parentId`, `leaderId`, `order`, `enable`, `createTime`, `updateTime`) VALUES
(1, 'DEPT_ROOT', '总公司', '公司总部', NULL, NULL, 0, 1, '2026-02-03 09:25:16', '2026-02-03 09:25:16'),
(2, 'DEPT_TECH', '技术部', '负责技术研发', 1, NULL, 1, 1, '2026-02-03 09:25:16', '2026-02-03 09:25:16'),
(3, 'DEPT_SALES', '销售部', '负责市场销售', 1, NULL, 2, 1, '2026-02-03 09:25:16', '2026-02-03 09:25:16'),
(4, 'DEPT_HR', '人力资源部', '负责人力资源管理', 1, NULL, 3, 1, '2026-02-03 09:25:16', '2026-02-03 09:25:16'),
(5, 'DEPT_FINANCE', '财务部', '负责财务管理', 1, NULL, 4, 1, '2026-02-03 09:25:16', '2026-02-03 09:25:16'),
(6, 'DEPT_TECH_FE', '前端组', '前端开发团队', 2, NULL, 1, 1, '2026-02-03 09:25:16', '2026-02-03 09:25:16'),
(7, 'DEPT_TECH_BE', '后端组', '后端开发团队', 2, NULL, 2, 1, '2026-02-03 09:25:16', '2026-02-03 09:25:16'),
(8, 'DEPT_TECH_QA', '测试组', '质量保证团队', 2, NULL, 3, 1, '2026-02-03 09:25:16', '2026-02-03 09:25:16');

-- ----------------------------
-- Records of dict
-- ----------------------------
INSERT INTO `dict` (`id`, `code`, `name`, `description`, `enable`, `createTime`, `updateTime`) VALUES
(1, 'PERMISSION_TYPE', '权限类型', '系统权限节点类型', 1, '2026-02-04 08:07:22', '2026-02-04 08:07:22'),
(2, 'SMS_PROVIDER', '短信厂商', '短信服务提供商', 1, '2026-02-15 13:00:00', '2026-02-15 13:00:00');

-- ----------------------------
-- Records of dict_item
-- ----------------------------
INSERT INTO `dict_item` (`id`, `dictId`, `label`, `value`, `color`, `description`, `sort`, `enable`, `createTime`, `updateTime`) VALUES
(1, 1, '模块', 'MODULE', 'primary', '顶层模块，用于组织一级菜单', 1, 1, '2026-02-04 08:07:22', '2026-02-04 08:07:22'),
(2, 1, '目录', 'CATALOG', 'info', '菜单目录，用于组织子菜单', 2, 1, '2026-02-04 08:07:22', '2026-02-04 08:07:22'),
(3, 1, '菜单', 'MENU', 'success', '具体的菜单页面', 3, 1, '2026-02-04 08:07:22', '2026-02-04 08:07:22'),
(4, 1, '按钮', 'BUTTON', 'warning', '页面内的操作按钮', 4, 1, '2026-02-04 08:07:22', '2026-02-04 08:07:22'),
(5, 1, '接口', 'API', 'default', 'API 接口权限', 5, 1, '2026-02-04 08:07:22', '2026-02-04 08:07:22'),
(6, 2, '阿里云', 'aliyun', 'processing', NULL, 1, 1, '2026-02-15 13:00:00', '2026-02-15 13:00:00'),
(7, 2, '腾讯云', 'tencent', 'success', NULL, 2, 1, '2026-02-15 13:00:00', '2026-02-15 13:00:00'),
(8, 2, '华为云', 'huawei', 'warning', NULL, 3, 1, '2026-02-15 13:00:00', '2026-02-15 13:00:00'),
(9, 2, '其他', 'other', 'default', NULL, 4, 1, '2026-02-15 13:00:00', '2026-02-15 13:00:00');

-- ----------------------------
-- Records of file (empty)
-- ----------------------------

-- ----------------------------
-- Records of file_share (empty)
-- ----------------------------

-- ----------------------------
-- Records of file_version (empty)
-- ----------------------------

-- ----------------------------
-- Records of folder (empty)
-- ----------------------------

-- ----------------------------
-- Records of permission
-- ----------------------------
INSERT INTO `permission` (`id`, `name`, `code`, `type`, `parentId`, `path`, `redirect`, `icon`, `component`, `layout`, `keepAlive`, `method`, `description`, `show`, `enable`, `order`) VALUES
(1, '系统管理', 'system-management', 'MODULE', NULL, NULL, NULL, 'lucide:settings', NULL, NULL, NULL, NULL, '系统管理模块', 1, 1, 1),
(10, '仪表盘', 'dashboard', 'CATALOG', 1, '/dashboard', NULL, 'lucide:layout-dashboard', NULL, NULL, NULL, NULL, '仪表盘目录', 1, 1, 1),
(11, '组织管理', 'organization', 'CATALOG', 1, '/organization', NULL, 'lucide:building-2', NULL, NULL, NULL, NULL, '组织管理目录', 1, 1, 2),
(12, '权限管理', 'permission', 'CATALOG', 1, '/permission', NULL, 'lucide:shield-check', NULL, NULL, NULL, NULL, '权限管理目录', 1, 1, 3),
(13, '客户端管理', 'client', 'CATALOG', 1, '/client', NULL, 'lucide:monitor-smartphone', NULL, NULL, NULL, NULL, '客户端管理目录', 1, 1, 4),
(14, '系统工具', 'system-tools', 'CATALOG', 1, '/system-tools', NULL, 'lucide:wrench', NULL, NULL, NULL, NULL, '系统工具目录', 1, 1, 5),
(101, '分析页', 'analytics', 'MENU', 10, '/dashboard/analytics', NULL, 'lucide:area-chart', '/dashboard/analytics/index', 'default', 1, NULL, '数据分析页面', 1, 1, 1),
(102, '工作台', 'workspace', 'MENU', 10, '/dashboard/workspace', NULL, 'carbon:workspace', '/dashboard/workspace/index', 'default', 1, NULL, '工作台页面', 1, 1, 2),
(111, '组织架构', 'organization-org', 'MENU', 11, '/organization/org', NULL, 'lucide:network', '/organization/org/index', 'default', 1, NULL, '组织架构管理', 1, 1, 1),
(112, '用户管理', 'organization-user', 'MENU', 11, '/organization/user', NULL, 'lucide:user', '/organization/user/index', 'default', 1, NULL, '用户管理', 1, 1, 2),
(113, '岗位管理', 'organization-position', 'MENU', 11, '/organization/position', NULL, 'lucide:briefcase', '/organization/position/index', 'default', 1, NULL, '岗位管理', 1, 1, 3),
(114, '用户组管理', 'organization-group', 'MENU', 11, '/organization/group', NULL, 'lucide:users', '/organization/group/index', 'default', 1, NULL, '用户组管理', 1, 1, 4),
(121, '模块管理', 'permission-module', 'MENU', 12, '/permission/module', NULL, 'lucide:layers', '/permission/module/index', 'default', 1, NULL, '模块管理', 1, 1, 1),
(122, '角色管理', 'permission-role', 'MENU', 12, '/permission/role', NULL, 'lucide:users', '/permission/role/index', 'default', 1, NULL, '角色管理', 1, 1, 2),
(123, '菜单管理', 'permission-menu', 'MENU', 12, '/permission/menu', NULL, 'lucide:menu', '/permission/menu/index', 'default', 1, NULL, '菜单管理', 1, 1, 3),
(131, '客户端模块', 'client-module', 'MENU', 13, '/client/module', NULL, 'lucide:layers', '/client/module/index', 'default', 1, NULL, '客户端模块管理', 1, 1, 1),
(132, '客户端菜单', 'client-menu', 'MENU', 13, '/client/menu', NULL, 'lucide:menu', '/client/menu/index', 'default', 1, NULL, '客户端菜单管理', 1, 1, 2),
(133, '客户端用户', 'client-user', 'MENU', 13, '/client/user', NULL, 'lucide:user', '/client/user/index', 'default', 1, NULL, '客户端用户管理', 1, 1, 3),
(141, '数据字典', 'system-tools-dict', 'MENU', 14, '/system-tools/dict', NULL, 'lucide:book-open', '/system-tools/dict/index', 'default', 1, NULL, '数据字典管理', 1, 1, 1),
(142, '文件管理', 'system-tools-file', 'MENU', 14, '/system-tools/file', NULL, 'lucide:folder', '/system-tools/file/index', 'default', 1, NULL, '文件管理', 1, 1, 2),
(143, '系统配置', 'system-tools-config', 'MENU', 14, '/system-tools/config', NULL, 'lucide:settings', '/system-tools/config/index', 'default', 1, NULL, '系统配置', 1, 1, 3),
(1121, '查看', 'organization-user:view', 'BUTTON', 112, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '查看用户详情', 1, 1, 1),
(1122, '新增', 'organization-user:create', 'BUTTON', 112, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '新增用户', 1, 1, 2),
(1123, '编辑', 'organization-user:update', 'BUTTON', 112, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '编辑用户', 1, 1, 3),
(1124, '删除', 'organization-user:delete', 'BUTTON', 112, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '删除用户', 1, 1, 4),
(1125, '导出', 'organization-user:export', 'BUTTON', 112, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '导出用户数据', 1, 1, 5),
(1126, '导入', 'organization-user:import', 'BUTTON', 112, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '导入用户数据', 1, 1, 6),
(1127, '重置密码', 'organization-user:reset-password', 'BUTTON', 112, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '重置用户密码', 1, 1, 7),
(1221, '查看', 'permission-role:view', 'BUTTON', 122, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '查看角色详情', 1, 1, 1),
(1222, '新增', 'permission-role:create', 'BUTTON', 122, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '新增角色', 1, 1, 2),
(1223, '编辑', 'permission-role:update', 'BUTTON', 122, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '编辑角色', 1, 1, 3),
(1224, '删除', 'permission-role:delete', 'BUTTON', 122, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '删除角色', 1, 1, 4),
(1225, '分配权限', 'permission-role:assign-permission', 'BUTTON', 122, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '分配角色权限', 1, 1, 5),
(1226, '分配用户', 'permission-role:assign-user', 'BUTTON', 122, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '分配角色用户', 1, 1, 6),
(1231, '查看', 'permission-menu:view', 'BUTTON', 123, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '查看菜单详情', 1, 1, 1),
(1232, '新增', 'permission-menu:create', 'BUTTON', 123, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '新增菜单', 1, 1, 2),
(1233, '编辑', 'permission-menu:update', 'BUTTON', 123, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '编辑菜单', 1, 1, 3),
(1234, '删除', 'permission-menu:delete', 'BUTTON', 123, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '删除菜单', 1, 1, 4),
(1331, '查看', 'client-user:view', 'BUTTON', 133, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '查看客户端用户', 1, 1, 1),
(1332, '新增', 'client-user:create', 'BUTTON', 133, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '新增客户端用户', 1, 1, 2),
(1333, '编辑', 'client-user:update', 'BUTTON', 133, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '编辑客户端用户', 1, 1, 3),
(1334, '删除', 'client-user:delete', 'BUTTON', 133, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '删除客户端用户', 1, 1, 4),
(1335, '重置密码', 'client-user:reset-password', 'BUTTON', 133, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '重置客户端用户密码', 1, 1, 5),
(15, '任务调度', 'scheduled-task', 'CATALOG', 1, '/scheduled-task', NULL, 'lucide:clock', NULL, NULL, NULL, NULL, '任务调度目录', 1, 1, 6),

(151, '任务管理', 'scheduled-task-task', 'MENU', 15, '/scheduled-task/task', NULL, 'lucide:list-checks', '/scheduled-task/task/index', 'default', 1, NULL, '定时任务管理', 1, 1, 1),
(152, '任务日志', 'scheduled-task-log', 'MENU', 15, '/scheduled-task/log', NULL, 'lucide:file-text', '/scheduled-task/log/index', 'default', 1, NULL, '任务执行日志', 1, 1, 2),
(1511, '查看', 'scheduled-task:view', 'BUTTON', 151, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '查看定时任务', 1, 1, 1),
(1512, '新增', 'scheduled-task:create', 'BUTTON', 151, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '新增定时任务', 1, 1, 2),
(1513, '编辑', 'scheduled-task:update', 'BUTTON', 151, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '编辑定时任务', 1, 1, 3),
(1514, '删除', 'scheduled-task:delete', 'BUTTON', 151, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '删除定时任务', 1, 1, 4),
(1515, '启停', 'scheduled-task:toggle', 'BUTTON', 151, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '启停定时任务', 1, 1, 5),
(1516, '执行', 'scheduled-task:trigger', 'BUTTON', 151, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '手动执行定时任务', 1, 1, 6),
(1521, '查看', 'scheduled-task-log:view', 'BUTTON', 152, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '查看任务执行日志', 1, 1, 1),
(1522, '清空', 'scheduled-task-log:clear', 'BUTTON', 152, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '清空任务执行日志', 1, 1, 2),
(16, '审计日志', 'audit-log', 'CATALOG', 1, '/audit-log', NULL, 'lucide:file-text', NULL, NULL, NULL, NULL, '审计日志目录', 1, 1, 7),
(161, '操作日志', 'audit-log-list', 'MENU', 16, '/audit-log/list', NULL, 'lucide:list', '/audit-log/list/index', 'default', 1, NULL, '操作日志查看', 1, 1, 1),
(1611, '查看', 'audit-log:view', 'BUTTON', 161, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '查看审计日志详情', 1, 1, 1),
(1612, '导出', 'audit-log:export', 'BUTTON', 161, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '导出审计日志', 1, 1, 2);

-- 爬虫管理模块（独立 MODULE）
INSERT INTO `permission` (`id`, `name`, `code`, `type`, `parentId`, `path`, `redirect`, `icon`, `component`, `layout`, `keepAlive`, `method`, `description`, `show`, `enable`, `order`) VALUES
(1300, '爬虫管理', 'crawler-management', 'MODULE', NULL, NULL, NULL, 'lucide:bug', NULL, NULL, NULL, NULL, '爬虫管理模块', 1, 1, 2),
(1301, '爬虫管理', 'crawler', 'CATALOG', 1300, '/crawler', '/crawler/task', 'lucide:bug', NULL, NULL, NULL, NULL, '爬虫管理目录', 1, 1, 1),
(1302, '任务管理', 'crawler-task', 'MENU', 1301, '/crawler/task', NULL, 'lucide:list-todo', '/crawler/task/index', 'default', 1, NULL, '爬虫任务管理', 1, 1, 1),
(1303, '爬取结果', 'crawler-result', 'MENU', 1301, '/crawler/result', NULL, 'lucide:file-search', '/crawler/result/index', 'default', 1, NULL, '爬取结果查看', 1, 1, 2),
(1304, 'AI 文章', 'crawler-article', 'MENU', 1301, '/crawler/article', NULL, 'lucide:file-text', '/crawler/article/index', 'default', 1, NULL, 'AI 生成的深度技术文章', 1, 1, 3);

-- ----------------------------
-- Records of position
-- ----------------------------
INSERT INTO `position` (`id`, `code`, `name`, `description`, `sort`, `enable`, `createTime`, `updateTime`) VALUES
(1, 'CEO', '首席执行官', '公司最高管理者', 1, 1, '2026-02-03 09:51:12', '2026-02-03 09:51:12'),
(2, 'CTO', '首席技术官', '技术部门负责人', 2, 1, '2026-02-03 09:51:12', '2026-02-03 09:51:12'),
(3, 'CFO', '首席财务官', '财务部门负责人', 3, 1, '2026-02-03 09:51:12', '2026-02-03 09:51:12'),
(4, 'MANAGER', '部门经理', '部门管理人员', 10, 1, '2026-02-03 09:51:12', '2026-02-03 09:51:12'),
(5, 'TEAM_LEADER', '团队负责人', '团队管理人员', 20, 1, '2026-02-03 09:51:12', '2026-02-03 09:51:12'),
(6, 'SENIOR_ENGINEER', '高级工程师', '资深技术人员', 30, 1, '2026-02-03 09:51:12', '2026-02-03 09:51:12'),
(7, 'ENGINEER', '工程师', '普通技术人员', 40, 1, '2026-02-03 09:51:12', '2026-02-03 09:51:12'),
(8, 'JUNIOR_ENGINEER', '初级工程师', '初级技术人员', 50, 1, '2026-02-03 09:51:12', '2026-02-03 09:51:12'),
(9, 'INTERN', '实习生', '实习人员', 60, 1, '2026-02-03 09:51:12', '2026-02-03 09:51:12');

-- ----------------------------
-- Records of profile
-- ----------------------------
INSERT INTO `profile` (`id`, `gender`, `avatar`, `address`, `email`, `userId`, `nickName`) VALUES
(1, NULL, 'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif?imageView2/1/w/80/h/80', NULL, NULL, 1, 'Admin'),
(2, NULL, 'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif?imageView2/1/w/80/h/80', NULL, NULL, 2, NULL);

-- ----------------------------
-- Records of role
-- ----------------------------
INSERT INTO `role` (`id`, `code`, `name`, `enable`, `description`) VALUES
(1, 'SUPER_ADMIN', '超级管理员', 1, NULL),
(3, 'sys_admin', '系统管理员', 1, '1111');

-- ----------------------------
-- Records of storage_config
-- ----------------------------
INSERT INTO `storage_config` (`id`, `name`, `type`, `description`, `isDefault`, `enabled`, `createdAt`, `updatedAt`, `code`, `storagePath`, `accessPath`, `enableRecycleBin`, `recycleBinPath`, `sort`) VALUES
(5, '本地存储', 'local', '默认本地文件存储，文件保存在服务器本地磁盘', 1, 1, '2026-02-08 17:47:06', '2026-02-08 17:47:06', 'local_default', './uploads', 'http://localhost:8085/uploads/', 1, '.RECYCLE.BIN/', 999),
(6, '测试本地存储', 'local', '用于测试的本地存储配置', 0, 1, '2026-02-08 18:05:19', '2026-02-08 18:50:46', 'test-local', './uploads-test', 'http://localhost:8085/uploads-test/', 1, '.RECYCLE.BIN/', 2);

-- ----------------------------
-- Records of storage_quota
-- ----------------------------
INSERT INTO `storage_quota` (`id`, `userId`, `total`, `used`, `fileCount`, `folderCount`, `createdAt`, `updatedAt`) VALUES
(2, 1, 10737418240, 0, 0, 0, '2026-02-08 14:52:18', '2026-02-10 09:11:40');

-- ----------------------------
-- Records of role_permission
-- ----------------------------
INSERT INTO `role_permission` (`roleId`, `permissionId`) VALUES
(1, 1),
(1, 2),
(1, 10),
(1, 11),
(1, 12),
(1, 13),
(1, 14),
(1, 20),
(1, 101),
(1, 102),
(1, 111),
(1, 112),
(1, 113),
(1, 114),
(1, 121),
(1, 122),
(1, 123),
(1, 131),
(1, 132),
(1, 133),
(1, 141),
(1, 142),
(1, 143),
(1, 201),
(1, 202),
(1, 1121),
(1, 1122),
(1, 1123),
(1, 1124),
(1, 1125),
(1, 1126),
(1, 1127),
(1, 1221),
(1, 1222),
(1, 1223),
(1, 1224),
(1, 1225),
(1, 1226),
(1, 1231),
(1, 1232),
(1, 1233),
(1, 1234),
(1, 1331),
(1, 1332),
(1, 1333),
(1, 1334),
(1, 1335),
(1, 15),
(1, 151),
(1, 152),
(1, 1511),
(1, 1512),
(1, 1513),
(1, 1514),
(1, 1515),
(1, 1516),
(1, 1521),
(1, 1522),
(1, 16),
(1, 161),
(1, 1611),
(1, 1612),
(1, 1300),
(1, 1301),
(1, 1302),
(1, 1303),
(1, 1304),
(2, 1),
(2, 10),
(2, 11),
(2, 12),
(2, 13),
(2, 14),
(2, 101),
(2, 102),
(2, 111),
(2, 112),
(2, 113),
(2, 114),
(2, 121),
(2, 122),
(2, 123),
(2, 131),
(2, 132),
(2, 141),
(2, 142),
(2, 143),
(3, 1),
(3, 10),
(3, 11),
(3, 101),
(3, 102),
(3, 112),
(3, 1121);

-- ----------------------------
-- Records of password_history (empty - 应用启动后自动记录)
-- ----------------------------

-- ----------------------------
-- Records of security_config
-- 安全策略默认配置（应用启动时也会自动播种缺失的配置）
-- ----------------------------
INSERT INTO `security_config` (`configGroup`, `configData`, `description`) VALUES
('password_policy', '{"minLength":8,"maxLength":32,"requireUppercase":true,"requireLowercase":true,"requireNumber":true,"requireSpecial":false,"specialChars":"!@#$%^&*()_+-=[]{}|;:,.<>?","expiryEnabled":false,"expiryDays":90,"expiryWarningDays":7,"historyEnabled":true,"historyCount":3,"rememberPasswordCount":3}', '密码策略配置'),
('account_lockout', '{"enabled":true,"maxAttempts":5,"lockoutDuration":30,"redisKeyPrefix":"login_fail:","persistToDb":false}', '账号锁定配置'),
('audit_policy', '{"enabled":true,"saveReqBody":false,"saveResBody":false,"ignorePaths":["/health","/metrics"],"maskingEnabled":true,"sensitiveFields":["password","oldPassword","newPassword","token","accessToken","refreshToken","authorization","cookie","secret"],"retentionDays":90,"autoCleanup":true}', '审计日志配置');

-- ----------------------------
-- Records of user
-- 密码: 123456 (BCrypt加密)
-- ----------------------------
INSERT INTO `user` (`id`, `username`, `password`, `enable`, `createTime`, `updateTime`, `departmentId`, `positionId`, `passwordUpdatedAt`, `mustChangePassword`, `lastLoginAt`, `lastLoginIp`) VALUES
(1, 'admin', '$2a$10$FsAafxTTVVGXfIkJqvaiV.1vPfq4V9HW298McPldJgO829PR52a56', 1, '2023-11-18 08:18:59', '2023-11-18 08:18:59', NULL, NULL, NULL, 0, NULL, NULL),
(2, 'weize1130', '$2a$10$2KUGf4Wmp83PYnRlw0kNfOs1gr3rHI8A8de64.EpXJiPqL9gHCKDa', 1, '2026-01-31 07:15:07', '2026-01-31 07:15:07', NULL, NULL, NULL, 0, NULL, NULL);

-- ----------------------------
-- Records of user_group
-- ----------------------------
INSERT INTO `user_group` (`id`, `code`, `name`, `description`, `enable`, `sort`, `createTime`, `updateTime`) VALUES
(1, 'SALES_TEAM', '销售团队', '负责产品销售和客户关系维护', 1, 1, '2026-02-03 10:04:51', '2026-02-03 10:04:51'),
(2, 'DEV_TEAM', '开发团队', '负责产品研发和技术支持', 1, 2, '2026-02-03 10:04:51', '2026-02-03 10:04:51'),
(3, 'DESIGN_TEAM', '设计团队', '负责产品设计和用户体验', 1, 3, '2026-02-03 10:04:51', '2026-02-03 10:04:51'),
(4, 'MARKETING_TEAM', '市场团队', '负责市场推广和品牌建设', 1, 4, '2026-02-03 10:04:51', '2026-02-03 10:04:51'),
(5, 'HR_TEAM', '人力资源团队', '负责人员招聘和员工管理', 1, 5, '2026-02-03 10:04:51', '2026-02-03 10:04:51'),
(6, 'FINANCE_TEAM', '财务团队', '负责财务管理和成本控制', 1, 6, '2026-02-03 10:04:51', '2026-02-03 10:04:51');

-- ----------------------------
-- Records of user_group_member (empty)
-- ----------------------------

-- ----------------------------
-- Records of user_group_permission (empty)
-- ----------------------------

-- ----------------------------
-- Records of user_role
-- ----------------------------
INSERT INTO `user_role` (`userId`, `roleId`) VALUES
(1, 1);

-- ----------------------------
-- Records of scheduled_task (初始定时任务)
-- ----------------------------
INSERT INTO `scheduled_task` (`name`, `taskGroup`, `description`, `triggerType`, `cronExpression`, `intervalSeconds`, `taskType`, `handlerName`, `taskParams`, `httpMethod`, `httpHeaders`, `httpAuthType`, `httpAuthValue`, `blockingStrategy`, `timeoutSeconds`, `maxRetryCount`, `retryInterval`, `enabled`)
VALUES
('系统清理任务', 'system', '每天凌晨3点清理审计日志和过期密码历史', 'CRON', '0 3 * * *', NULL, 'LOCAL', 'cleanup-scheduler', NULL, NULL, NULL, NULL, NULL, 'DISCARD', 300, 1, 60, 1);

-- ----------------------------
-- Records of scheduled_task_log
-- 定时任务执行日志（示例数据）
-- ----------------------------
INSERT INTO `scheduled_task_log` VALUES 
(1,1,'系统清理任务','MANUAL','2026-03-10 17:11:15','2026-03-10 17:11:15',48,'SUCCESS','',NULL,0),
(2,1,'系统清理任务','SCHEDULE','2026-03-11 03:00:00','2026-03-11 03:00:00',48,'SUCCESS','',NULL,0);

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================
-- 数据验证查询
-- ========================================

-- 验证权限层级结构
SELECT 
  CONCAT('MODULE: ', COUNT(CASE WHEN type = 'MODULE' THEN 1 END)) as modules,
  CONCAT('CATALOG: ', COUNT(CASE WHEN type = 'CATALOG' THEN 1 END)) as catalogs,
  CONCAT('MENU: ', COUNT(CASE WHEN type = 'MENU' THEN 1 END)) as menus,
  CONCAT('BUTTON: ', COUNT(CASE WHEN type = 'BUTTON' THEN 1 END)) as buttons,
  CONCAT('TOTAL: ', COUNT(*)) as total
FROM permission;

-- 验证用户角色分配
SELECT 
  u.username,
  GROUP_CONCAT(r.name) as roles
FROM user u
LEFT JOIN user_role ur ON u.id = ur.userId
LEFT JOIN role r ON ur.roleId = r.id
GROUP BY u.id, u.username;

-- 验证角色权限数量
SELECT 
  r.name as role_name,
  COUNT(rp.permissionId) as permission_count
FROM role r
LEFT JOIN role_permission rp ON r.id = rp.roleId
GROUP BY r.id, r.name;
