import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModuleCodeToClientUser20260215160000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 使用 IF NOT EXISTS 防止重复添加列
    const columns = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_user' AND COLUMN_NAME = 'moduleCode'`,
    );
    if (columns.length === 0) {
      await queryRunner.query(
        `ALTER TABLE \`client_user\` ADD COLUMN \`moduleCode\` varchar(50) NULL COMMENT '所属客户端模块编码' AFTER \`gender\``,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`client_user\` DROP COLUMN \`moduleCode\``,
    );
  }
}
