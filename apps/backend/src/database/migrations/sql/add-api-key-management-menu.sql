-- ============================================
-- API Key 管理菜单和权限配置
-- ============================================

-- 1. 添加 API Key 管理菜单到系统工具目录下
INSERT IGNORE INTO `permission` (`id`, `name`, `code`, `type`, `parentId`, `path`, `redirect`, `icon`, `component`, `layout`, `keepAlive`, `method`, `description`, `show`, `enable`, `order`) VALUES
(1104, 'API Key 管理', 'system-tools-api-key', 'MENU', 1100, '/system-tools/api-key', NULL, 'lucide:key', '/system-tools/api-key/index', 'default', 1, NULL, 'API Key 管理，用于爬虫接口认证', 1, 1, 4);

-- 2. 添加 API Key 管理的按钮权限
INSERT IGNORE INTO `permission` (`id`, `name`, `code`, `type`, `parentId`, `path`, `redirect`, `icon`, `component`, `layout`, `keepAlive`, `method`, `description`, `show`, `enable`, `order`) VALUES
(110401, '创建 API Key', 'system-tools-api-key:create', 'BUTTON', 1104, NULL, NULL, NULL, NULL, NULL, NULL, 'POST', '创建新的 API Key', 1, 1, 1),
(110402, '编辑 API Key', 'system-tools-api-key:update', 'BUTTON', 1104, NULL, NULL, NULL, NULL, NULL, NULL, 'PATCH', '编辑 API Key 信息', 1, 1, 2),
(110403, '删除 API Key', 'system-tools-api-key:delete', 'BUTTON', 1104, NULL, NULL, NULL, NULL, NULL, NULL, 'DELETE', '删除 API Key', 1, 1, 3),
(110404, '查看 API Key', 'system-tools-api-key:read', 'BUTTON', 1104, NULL, NULL, NULL, NULL, NULL, NULL, 'GET', '查看 API Key 详情', 1, 1, 4),
(110405, '启用/禁用 API Key', 'system-tools-api-key:toggle', 'BUTTON', 1104, NULL, NULL, NULL, NULL, NULL, NULL, 'PATCH', '启用或禁用 API Key', 1, 1, 5),
(110406, '重新生成 API Key', 'system-tools-api-key:regenerate', 'BUTTON', 1104, NULL, NULL, NULL, NULL, NULL, NULL, 'POST', '重新生成 API Key', 1, 1, 6),
(110407, '查看使用统计', 'system-tools-api-key:stats', 'BUTTON', 1104, NULL, NULL, NULL, NULL, NULL, NULL, 'GET', '查看 API Key 使用统计', 1, 1, 7),
(110408, '查看访问日志', 'system-tools-api-key:logs', 'BUTTON', 1104, NULL, NULL, NULL, NULL, NULL, NULL, 'GET', '查看 API Key 访问日志', 1, 1, 8);

-- 3. 为超级管理员角色（roleId=1）分配新菜单和按钮权限
INSERT IGNORE INTO `role_permission` (`roleId`, `permissionId`) VALUES
(1, 1104),
(1, 110401),
(1, 110402),
(1, 110403),
(1, 110404),
(1, 110405),
(1, 110406),
(1, 110407),
(1, 110408);

-- ============================================
-- 验证查询
-- ============================================

-- 查看新添加的菜单
SELECT * FROM `permission` WHERE `id` = 1104;

-- 查看新添加的按钮权限
SELECT * FROM `permission` WHERE `parentId` = 1104;

-- 查看超级管理员的权限分配
SELECT rp.*, p.name, p.code 
FROM `role_permission` rp 
LEFT JOIN `permission` p ON rp.permissionId = p.id 
WHERE rp.roleId = 1 AND rp.permissionId IN (1104, 110401, 110402, 110403, 110404, 110405, 110406, 110407, 110408);
