import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHttpFieldsToScheduledTask1740217100000 implements MigrationInterface {
  name = 'AddHttpFieldsToScheduledTask1740217100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scheduled_task' AND COLUMN_NAME = 'httpMethod'`,
    );
    if (columns.length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`scheduled_task\`
          ADD COLUMN \`httpMethod\` enum('GET','POST','PUT','DELETE') NULL DEFAULT 'POST' COMMENT 'HTTP 请求方法' AFTER \`taskParams\`,
          ADD COLUMN \`httpHeaders\` text NULL COMMENT 'HTTP 自定义请求头 JSON' AFTER \`httpMethod\`,
          ADD COLUMN \`httpAuthType\` enum('NONE','BEARER','BASIC','API_KEY') NULL DEFAULT 'NONE' COMMENT 'HTTP 认证类型' AFTER \`httpHeaders\`,
          ADD COLUMN \`httpAuthValue\` varchar(500) NULL COMMENT 'HTTP 认证值' AFTER \`httpAuthType\`
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`scheduled_task\`
        DROP COLUMN \`httpAuthValue\`,
        DROP COLUMN \`httpAuthType\`,
        DROP COLUMN \`httpHeaders\`,
        DROP COLUMN \`httpMethod\`
    `);
  }
}
