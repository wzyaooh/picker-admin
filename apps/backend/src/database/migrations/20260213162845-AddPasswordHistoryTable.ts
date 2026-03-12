import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddPasswordHistoryTable20260213162845 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('password_history');

    if (!table) {
      // 表不存在，创建完整表
      await queryRunner.createTable(
        new Table({
          name: 'password_history',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'userId',
              type: 'int',
              comment: '用户ID',
            },
            {
              name: 'passwordHash',
              type: 'varchar',
              length: '255',
              comment: '密码哈希值',
            },
            {
              name: 'changedBy',
              type: 'int',
              isNullable: true,
              comment: '修改人ID',
            },
            {
              name: 'changeReason',
              type: 'varchar',
              length: '100',
              isNullable: true,
              comment: '修改原因',
            },
            {
              name: 'ipAddress',
              type: 'varchar',
              length: '50',
              isNullable: true,
              comment: '修改时的IP地址',
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              comment: '创建时间',
            },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'password_history',
        new TableIndex({
          name: 'IDX_PASSWORD_HISTORY_USER_CREATED',
          columnNames: ['userId', 'createdAt'],
        }),
      );
    } else {
      // 表已存在，补加缺失列
      if (!table.columns.some((c) => c.name === 'changedBy')) {
        await queryRunner.query(
          `ALTER TABLE \`password_history\` ADD \`changedBy\` int NULL COMMENT '修改人ID'`,
        );
      }
      if (!table.columns.some((c) => c.name === 'changeReason')) {
        await queryRunner.query(
          `ALTER TABLE \`password_history\` ADD \`changeReason\` varchar(100) NULL COMMENT '修改原因'`,
        );
      }
      if (!table.columns.some((c) => c.name === 'ipAddress')) {
        await queryRunner.query(
          `ALTER TABLE \`password_history\` ADD \`ipAddress\` varchar(50) NULL COMMENT '修改时的IP地址'`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('password_history');
    if (!table) return;

    await queryRunner.dropTable('password_history');
  }
}
