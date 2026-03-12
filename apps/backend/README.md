# Backend Service

基于 NestJS + TypeORM + MySQL + Redis 的后端管理系统 API 服务。

## 项目位置

本项目位于 vue-vben-admin monorepo 的 `apps/backend` 目录中，作为独立的后端服务运行。

```
vue-vben-admin/
├── apps/
│   ├── backend/          # 本项目 (NestJS 后端服务)
│   ├── backend-mock/     # Mock 后端服务
│   └── web-naive/        # 前端应用
├── packages/             # 共享包
└── internal/             # 内部工具
```

## 技术栈

- **框架**: NestJS 10.x
- **数据库**: MySQL 8.x + TypeORM 0.3.x
- **缓存**: Redis 4.x
- **认证**: JWT + Passport
- **文档**: Swagger/OpenAPI
- **日志**: Winston
- **验证**: class-validator + class-transformer
- **限流**: @nestjs/throttler

## 快速开始

### 1. 安装依赖

在 **monorepo 根目录** 运行以下命令安装所有依赖：

```bash
pnpm install
```

> **注意**: 必须在根目录运行 `pnpm install`，这样 pnpm workspace 会自动处理所有子项目的依赖。

### 2. 配置环境变量

复制环境变量模板文件并配置：

```bash
# 进入 backend 目录
cd apps/backend

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置数据库和 Redis 连接信息
```

**必需的环境变量**:

```bash
# 应用配置
APP_PORT=8085
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PWD=your_database_password
DB_DATABASE=vben_admin

# Redis 配置
REDIS_URL=redis://localhost:6379

# JWT 配置
JWT_SECRET=your_jwt_secret_key_change_in_production
```

> 完整的环境变量说明请查看 `.env.example` 文件。

### 3. 初始化数据库

首先确保 MySQL 服务已启动，然后创建数据库：

```bash
# 使用 MySQL 客户端创建数据库
mysql -u root -p
CREATE DATABASE vben_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

可选：使用提供的初始化脚本：

```bash
# 在 apps/backend 目录下
mysql -u root -p vben_admin < init.sql
```

### 4. 运行数据库迁移

```bash
# 查看待执行的迁移
pnpm migration:show

# 运行所有待执行的迁移
pnpm migration:run
```

### 5. 启动开发服务器

有三种方式启动开发服务器：

#### 方式 1: 从 monorepo 根目录启动（推荐）

```bash
# 在 vue-vben-admin 根目录
pnpm dev:backend
```

#### 方式 2: 使用 pnpm filter 启动

```bash
# 在 vue-vben-admin 根目录
pnpm -F @vben/backend run start:dev
```

#### 方式 3: 在 backend 目录直接启动

```bash
# 进入 backend 目录
cd apps/backend

# 启动开发服务器
pnpm start:dev
```

服务器启动后，访问：
- **API 服务**: http://localhost:8085
- **API 文档**: http://localhost:8085/docs
- **健康检查**: http://localhost:8085/health

## 开发指南

### 项目结构

```
apps/backend/
├── src/
│   ├── modules/              # 业务模块
│   │   ├── auth/            # 认证模块
│   │   ├── user/            # 用户模块
│   │   ├── role/            # 角色模块
│   │   ├── permission/      # 权限模块
│   │   ├── audit/           # 审计日志模块
│   │   └── health/          # 健康检查模块
│   ├── database/            # 数据库配置和迁移
│   │   ├── data-source.ts   # TypeORM 数据源配置
│   │   └── migrations/      # 数据库迁移文件
│   ├── shared/              # 共享模块
│   ├── common/              # 通用工具
│   ├── constants/           # 常量定义
│   ├── types/               # 类型定义
│   ├── app.module.ts        # 应用根模块
│   └── main.ts              # 应用入口
├── docs/                    # 技术文档
├── logs/                    # 日志目录
├── dist/                    # 构建输出
├── package.json             # 包配置
├── nest-cli.json            # NestJS CLI 配置
├── tsconfig.json            # TypeScript 配置
├── .env.example             # 环境变量模板
└── README.md                # 本文档
```

### 可用脚本

在 `apps/backend` 目录下可以运行以下命令：

```bash
# 开发
pnpm start:dev              # 启动开发服务器（热重载）
pnpm start:debug            # 启动调试模式

# 构建
pnpm build                  # 构建生产版本

# 生产
pnpm start:prod             # 启动生产服务器

# 代码质量
pnpm lint                   # 运行 ESLint 检查
pnpm format                 # 格式化代码

# 数据库迁移
pnpm migration:generate -- src/database/migrations/MigrationName  # 生成迁移文件
pnpm migration:create -- src/database/migrations/MigrationName    # 创建空迁移文件
pnpm migration:run          # 运行待执行的迁移
pnpm migration:revert       # 回滚最后一次迁移
pnpm migration:show         # 显示所有迁移状态
```

### 从 monorepo 根目录运行

也可以从 monorepo 根目录运行这些命令：

```bash
# 开发
pnpm dev:backend            # 启动开发服务器

# 构建
pnpm build:backend          # 构建生产版本

# 生产
pnpm start:backend          # 启动生产服务器
```

## 构建生产版本

### 构建命令

```bash
# 从 monorepo 根目录构建
pnpm build:backend

# 或在 backend 目录构建
cd apps/backend
pnpm build
```

构建完成后会生成两个目录：
- `dist/`: NestJS 编译输出（用于 Node.js 运行）
- `ncc-dist/`: 打包后的单文件输出（用于部署）

### 运行生产版本

```bash
# 从 monorepo 根目录运行
pnpm start:backend

# 或在 backend 目录运行
cd apps/backend
pnpm start:prod
```

## 数据库迁移

### 生成迁移文件

当修改实体（Entity）后，需要生成迁移文件：

```bash
# 在 apps/backend 目录
pnpm migration:generate -- src/database/migrations/DescriptiveName
```

TypeORM 会自动检测实体变化并生成相应的 SQL 语句。

### 创建空迁移文件

如果需要手动编写迁移：

```bash
pnpm migration:create -- src/database/migrations/CustomMigration
```

### 运行迁移

```bash
# 查看待执行的迁移
pnpm migration:show

# 运行所有待执行的迁移
pnpm migration:run
```

### 回滚迁移

```bash
# 回滚最后一次迁移
pnpm migration:revert
```

> **重要**: 生产环境的数据库迁移应该谨慎操作，建议先在测试环境验证。

## API 文档

### 访问 Swagger 文档

开发环境下，Swagger API 文档默认启用：

- **文档地址**: http://localhost:8085/docs

Swagger 文档提供：
- 所有 API 端点的详细说明
- 请求/响应示例
- 在线测试功能（Try it out）
- JWT 认证支持

### 使用 API 文档

1. 访问 http://localhost:8085/docs
2. 点击 "Authorize" 按钮
3. 输入 JWT token（格式：`Bearer <token>`）
4. 现在可以测试需要认证的 API

### 生产环境

生产环境建议禁用 Swagger 文档，在 `.env` 中设置：

```bash
SWAGGER_ENABLED=false
```

## 环境变量配置

### 配置文件

- `.env.example`: 环境变量模板（已提交到 Git）
- `.env`: 实际环境变量配置（不提交到 Git）

### 配置方法

1. **本地开发**: 复制 `.env.example` 为 `.env` 并修改
2. **Docker 部署**: 使用 Docker 环境变量或挂载 `.env` 文件
3. **云平台部署**: 在平台控制台配置环境变量

### 主要配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `APP_PORT` | 应用端口 | 8085 |
| `NODE_ENV` | 运行环境 | development |
| `DB_HOST` | 数据库主机 | localhost |
| `DB_PORT` | 数据库端口 | 3306 |
| `DB_USER` | 数据库用户 | root |
| `DB_PWD` | 数据库密码 | - |
| `DB_DATABASE` | 数据库名称 | vben_admin |
| `REDIS_URL` | Redis 连接 URL | redis://localhost:6379 |
| `JWT_SECRET` | JWT 密钥 | - |
| `SWAGGER_ENABLED` | 是否启用 Swagger | true |
| `LOG_LEVEL` | 日志级别 | info |

> 完整配置说明请查看 `.env.example` 文件中的注释。

## 核心功能

### 认证与授权

- **JWT 认证**: 基于 JSON Web Token 的无状态认证
- **RBAC 权限控制**: 基于角色的访问控制
- **密码加密**: 使用 bcrypt 加密存储
- **验证码**: SVG 验证码生成

### 数据库

- **ORM**: TypeORM 提供类型安全的数据库操作
- **迁移**: 版本化的数据库结构管理
- **连接池**: 自动管理数据库连接
- **事务支持**: 支持数据库事务操作

### 缓存

- **Redis**: 用于会话存储和数据缓存
- **优雅降级**: Redis 不可用时应用仍可启动

### 日志

- **Winston**: 强大的日志管理
- **日志轮转**: 按天自动轮转日志文件
- **多级别**: error, warn, info, debug, verbose
- **日志目录**: `logs/`

### 安全

- **CORS**: 跨域资源共享配置
- **限流**: 防止 API 滥用
- **输入验证**: 自动验证请求数据
- **错误处理**: 统一的错误响应格式

### 监控

- **健康检查**: `/health` 端点
- **审计日志**: 记录用户操作
- **请求追踪**: Request ID 追踪

## 常见问题

### 1. 数据库连接失败

**问题**: 应用启动时报数据库连接错误

**解决方案**:
- 检查 MySQL 服务是否启动
- 验证 `.env` 中的数据库配置是否正确
- 确认数据库已创建（`CREATE DATABASE vben_admin`）
- 检查数据库用户权限

### 2. Redis 连接失败

**问题**: 应用启动时报 Redis 连接错误

**解决方案**:
- 检查 Redis 服务是否启动
- 验证 `.env` 中的 `REDIS_URL` 是否正确
- 注意：Redis 连接失败不会阻止应用启动（优雅降级）

### 3. 端口被占用

**问题**: 启动时报端口 8085 已被占用

**解决方案**:
- 修改 `.env` 中的 `APP_PORT` 为其他端口
- 或停止占用 8085 端口的进程

### 4. 依赖安装失败

**问题**: `pnpm install` 失败

**解决方案**:
- 确保使用 pnpm >= 10.0.0
- 确保 Node.js >= 20.19.0
- 在 monorepo 根目录运行 `pnpm install`
- 清理缓存：`pnpm clean && pnpm install`

### 5. 迁移执行失败

**问题**: `pnpm migration:run` 失败

**解决方案**:
- 检查数据库连接是否正常
- 查看迁移文件是否有语法错误
- 检查数据库用户是否有足够权限
- 查看 `migrations` 表确认迁移状态

## 开发建议

### 代码规范

- 使用 ESLint 和 Prettier 保持代码风格一致
- 提交前运行 `pnpm lint` 和 `pnpm format`
- 遵循 NestJS 最佳实践

### 数据库操作

- 使用 TypeORM 的 Repository 模式
- 避免使用 `synchronize: true`（使用迁移管理结构）
- 复杂查询使用 QueryBuilder
- 注意 N+1 查询问题

### 安全建议

- 生产环境使用强 JWT 密钥
- 定期更新依赖包
- 不要在代码中硬编码敏感信息
- 使用环境变量管理配置
- 定期审查审计日志

### 性能优化

- 合理使用 Redis 缓存
- 数据库查询添加适当索引
- 使用分页避免大量数据查询
- 监控慢查询并优化

## 相关链接

- [NestJS 官方文档](https://docs.nestjs.com/)
- [TypeORM 官方文档](https://typeorm.io/)
- [Vue Vben Admin 文档](https://doc.vben.pro/)
- [项目 GitHub](https://github.com/vbenjs/vue-vben-admin)

## 技术支持

如有问题或建议，请：
- 查看 `docs/` 目录中的技术文档
- 提交 Issue 到项目仓库
- 查看 Swagger API 文档

## License

MIT License
