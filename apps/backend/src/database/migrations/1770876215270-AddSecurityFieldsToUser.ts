import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSecurityFieldsToUser1770876215270 implements MigrationInterface {
    name = 'AddSecurityFieldsToUser1770876215270'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`passwordUpdatedAt\` datetime NULL COMMENT '密码最后修改时间'`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`mustChangePassword\` tinyint NOT NULL COMMENT '是否必须修改密码' DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`lastLoginAt\` datetime NULL COMMENT '最后登录时间'`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`lastLoginIp\` varchar(50) NULL COMMENT '最后登录IP'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`lastLoginIp\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`lastLoginAt\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`mustChangePassword\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`passwordUpdatedAt\``);
    }

}
