import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSecurityConfigTable20260215100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('security_config');
    if (table) return;

    await queryRunner.query(
      `CREATE TABLE \`security_config\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`configGroup\` varchar(50) NOT NULL COMMENT '配置分组',
        \`configData\` json NOT NULL COMMENT '配置数据（JSON）',
        \`description\` varchar(200) NULL COMMENT '配置描述',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        UNIQUE INDEX \`IDX_security_config_configGroup\` (\`configGroup\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('security_config');
    if (!table) return;

    await queryRunner.query(`DROP TABLE \`security_config\``);
  }
}
