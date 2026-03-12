# 数据库迁移使用指南

## 什么是数据库迁移（Migrations）？

数据库迁移是一种版本控制系统，用于管理数据库架构的变更。它可以：
- 跟踪数据库结构的所有变更历史
- 在不同环境间同步数据库结构
- 支持回滚到之前的版本
- 避免生产环境使用 `synchronize: true` 导致的数据丢失风险

## 常用命令

### 1. 生成迁移文件（推荐）
根据实体变更自动生成迁移文件：
```bash
npm run migration:generate src/database/migrations/MigrationName
```

### 2. 手动创建迁移文件
创建一个空的迁移文件：
```bash
npm run migration:create src/database/migrations/MigrationName
```

### 3. 执行迁移
将所有未执行的迁移应用到数据库：
```bash
npm run migration:run
```

### 4. 回滚迁移
回滚最后一次执行的迁移：
```bash
npm run migration:revert
```

### 5. 查看迁移状态
查看已执行和待执行的迁移：
```bash
npm run migration:show
```

## 使用流程

### 初次使用（从现有数据库生成初始迁移）

1. **确保数据库已存在且包含所有表**
   - 如果使用 `synchronize: true`，先启动一次应用生成表结构
   
2. **生成初始迁移**
   ```bash
   npm run migration:generate src/database/migrations/InitialSchema
   ```

3. **关闭 synchronize**
   在 `src/shared/shared.module.ts` 中设置：
   ```typescript
   synchronize: false
   ```

4. **执行迁移**
   ```bash
   npm run migration:run
   ```

### 日常开发流程

1. **修改实体文件**
   例如在 `User` 实体中添加新字段：
   ```typescript
   @Column({ nullable: true })
   phoneNumber: string;
   ```

2. **生成迁移文件**
   ```bash
   npm run migration:generate src/database/migrations/AddPhoneNumberToUser
   ```

3. **检查生成的迁移文件**
   查看 `src/database/migrations/` 目录下新生成的文件

4. **执行迁移**
   ```bash
   npm run migration:run
   ```

5. **如果有问题，可以回滚**
   ```bash
   npm run migration:revert
   ```

## 迁移文件示例

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneNumberToUser1234567890123 implements MigrationInterface {
  name = 'AddPhoneNumberToUser1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`phoneNumber\` varchar(255) NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`phoneNumber\``
    );
  }
}
```

## 注意事项

1. **永远不要修改已执行的迁移文件**
   - 已执行的迁移文件应该被视为不可变的
   - 如果需要修改，应该创建新的迁移文件

2. **生产环境部署前测试迁移**
   - 在测试环境先执行迁移
   - 确认迁移可以正常执行和回滚

3. **备份数据库**
   - 在生产环境执行迁移前，务必备份数据库

4. **迁移文件应该纳入版本控制**
   - 所有迁移文件都应该提交到 Git

5. **关闭 synchronize**
   - 使用 migrations 后，必须将 `synchronize` 设置为 `false`
   - 生产环境强制检查已在 `src/shared/shared.module.ts` 中实现

## 环境变量配置

确保 `.env` 文件包含以下配置：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PWD=your_password
DB_DATABASE=your_database

# 开发环境可以使用 synchronize，生产环境必须为 false
DB_SYNC=false

# 环境标识
NODE_ENV=development
```

## 常见问题

### Q: 为什么要使用 migrations？
A: 
- 避免 `synchronize: true` 在生产环境导致的数据丢失
- 提供数据库变更的版本控制
- 支持团队协作时的数据库同步
- 可以回滚到之前的版本

### Q: 什么时候使用 `migration:generate`，什么时候使用 `migration:create`？
A:
- `migration:generate`：当你修改了实体文件，让 TypeORM 自动检测变更并生成迁移（推荐）
- `migration:create`：当你需要执行复杂的数据迁移或自定义 SQL 时手动创建

### Q: 如何在多人协作时避免迁移冲突？
A:
1. 及时拉取最新代码
2. 执行 `npm run migration:run` 同步数据库
3. 再生成新的迁移文件
4. 提交前确保迁移可以正常执行

### Q: 生产环境如何执行迁移？
A:
1. 备份数据库
2. 部署新代码
3. 执行 `npm run migration:run`
4. 验证应用正常运行
5. 如有问题，执行 `npm run migration:revert` 回滚

## 更多信息

参考 TypeORM 官方文档：
https://typeorm.io/migrations
