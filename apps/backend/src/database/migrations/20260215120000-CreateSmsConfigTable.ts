import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSmsConfigTable20260215120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 创建 sms_config 表
    const table = await queryRunner.getTable('sms_config');
    if (!table) {
      await queryRunner.query(
        `CREATE TABLE \`sms_config\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`name\` varchar(100) NOT NULL COMMENT '配置名称',
          \`provider\` varchar(50) NOT NULL COMMENT '短信厂商',
          \`isDefault\` tinyint NOT NULL DEFAULT 0 COMMENT '是否为默认配置',
          \`accessKey\` varchar(200) NOT NULL COMMENT 'Access Key',
          \`secretKey\` varchar(200) NOT NULL COMMENT 'Secret Key',
          \`signName\` varchar(100) NOT NULL COMMENT '短信签名',
          \`templateId\` varchar(200) NOT NULL COMMENT '模板ID',
          \`enabled\` tinyint NOT NULL DEFAULT 1 COMMENT '是否启用',
          \`loadBalanceConfig\` text NULL COMMENT '负载均衡配置（JSON）',
          \`retryInterval\` int NOT NULL DEFAULT 60 COMMENT '重试间隔（秒）',
          \`remark\` text NULL COMMENT '备注',
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
          \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB`,
      );
    }

    // 2. 插入 SMS_PROVIDER 字典数据
    const [existing] = await queryRunner.query(
      `SELECT id FROM dict WHERE code = 'SMS_PROVIDER'`,
    );
    if (!existing) {
      await queryRunner.query(
        `INSERT INTO dict (code, name, description, enable) VALUES ('SMS_PROVIDER', '短信厂商', '短信服务提供商', 1)`,
      );
      const [dict] = await queryRunner.query(
        `SELECT id FROM dict WHERE code = 'SMS_PROVIDER'`,
      );
      await queryRunner.query(
        `INSERT INTO dict_item (dictId, label, value, color, sort, enable) VALUES
          (${dict.id}, '阿里云', 'aliyun', 'processing', 1, 1),
          (${dict.id}, '腾讯云', 'tencent', 'success', 2, 1),
          (${dict.id}, '华为云', 'huawei', 'warning', 3, 1),
          (${dict.id}, '其他', 'other', 'default', 4, 1)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除字典数据
    const [dict] = await queryRunner.query(
      `SELECT id FROM dict WHERE code = 'SMS_PROVIDER'`,
    );
    if (dict) {
      await queryRunner.query(`DELETE FROM dict_item WHERE dictId = ${dict.id}`);
      await queryRunner.query(`DELETE FROM dict WHERE id = ${dict.id}`);
    }

    // 删除表
    const table = await queryRunner.getTable('sms_config');
    if (table) {
      await queryRunner.query(`DROP TABLE \`sms_config\``);
    }
  }
}
