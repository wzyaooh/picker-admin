import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClientUserTable20260215150000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('client_user');
    if (table) return;

    await queryRunner.query(
      `CREATE TABLE \`client_user\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`username\` varchar(50) NOT NULL COMMENT '用户名',
        \`password\` varchar(255) NOT NULL COMMENT '密码',
        \`nickName\` varchar(50) NULL COMMENT '昵称',
        \`avatar\` varchar(255) NULL COMMENT '头像URL',
        \`phone\` varchar(20) NULL COMMENT '手机号',
        \`email\` varchar(100) NULL COMMENT '邮箱',
        \`gender\` tinyint NULL COMMENT '性别：0-女 1-男',
        \`enabled\` tinyint NOT NULL DEFAULT 1 COMMENT '是否启用',
        \`remark\` text NULL COMMENT '备注',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        UNIQUE KEY \`IDX_client_user_username\` (\`username\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户端用户表'`,
    );

    // 添加"客户端用户"菜单权限
    await queryRunner.query(
      `INSERT INTO \`permission\` (\`id\`, \`name\`, \`code\`, \`type\`, \`parentId\`, \`path\`, \`icon\`, \`component\`, \`description\`, \`show\`, \`enable\`, \`order\`) VALUES
        (133, '客户端用户', 'client-user', 'MENU', 13, '/client/user', 'lucide:user', '/client/user/index', '客户端用户管理', 1, 1, 3)`,
    );

    // 添加按钮权限
    await queryRunner.query(
      `INSERT INTO \`permission\` (\`id\`, \`name\`, \`code\`, \`type\`, \`parentId\`, \`description\`, \`show\`, \`enable\`, \`order\`) VALUES
        (1331, '查看', 'client-user:view', 'BUTTON', 133, '查看客户端用户', 1, 1, 1),
        (1332, '新增', 'client-user:create', 'BUTTON', 133, '新增客户端用户', 1, 1, 2),
        (1333, '编辑', 'client-user:update', 'BUTTON', 133, '编辑客户端用户', 1, 1, 3),
        (1334, '删除', 'client-user:delete', 'BUTTON', 133, '删除客户端用户', 1, 1, 4),
        (1335, '重置密码', 'client-user:reset-password', 'BUTTON', 133, '重置客户端用户密码', 1, 1, 5)`,
    );

    // 给超级管理员角色分配权限
    await queryRunner.query(
      `INSERT INTO \`role_permission\` (\`roleId\`, \`permissionId\`) VALUES
        (1, 133), (1, 1331), (1, 1332), (1, 1333), (1, 1334), (1, 1335)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除角色权限
    await queryRunner.query(
      `DELETE FROM \`role_permission\` WHERE \`permissionId\` IN (133, 1331, 1332, 1333, 1334, 1335)`,
    );
    // 删除权限
    await queryRunner.query(
      `DELETE FROM \`permission\` WHERE \`id\` IN (133, 1331, 1332, 1333, 1334, 1335)`,
    );
    // 删除表
    const table = await queryRunner.getTable('client_user');
    if (table) {
      await queryRunner.query(`DROP TABLE \`client_user\``);
    }
  }
}
