<div align="center">
  <h1>企业级后台管理系统</h1>
  <p>基于 Vue 3 + NestJS + Flask 的全栈解决方案</p>

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.19.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10.0.0-orange.svg)](https://pnpm.io/)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/)

</div>

## 📖 项目简介

这是一个功能完整的企业级后台管理系统，采用前后端分离架构，提供了用户管理、权限控制、审计日志、文件管理、爬虫任务等丰富功能。项目基于 Vue Vben Admin 5.0 框架构建，集成了 NestJS 后端服务和 Flask 爬虫服务，适合作为企业级应用的基础框架或学习参考。

### 技术栈

**前端 (web-naive)**
- 🚀 Vue 3 + TypeScript - 渐进式 JavaScript 框架
- ⚡️ Vite 5 - 下一代前端构建工具
- 🎨 Naive UI - 优雅的 Vue 3 组件库
- 🎯 Pinia - Vue 3 状态管理
- 🔐 Vue Router - 官方路由管理器
- 📦 Monorepo - Turborepo + pnpm workspace

**后端 (backend)**
- 🛡️ NestJS - 渐进式 Node.js 框架
- 🔒 JWT + Passport - 身份认证
- 🗄️ TypeORM + MySQL - 数据持久化
- 📝 Swagger - API 文档自动生成
- ⚡ Redis - 缓存和会话管理
- 📊 Winston - 日志管理
- ⏰ node-cron - 定时任务

**爬虫服务 (crawler)**
- 🐍 Flask - 轻量级 Python Web 框架
- 🕷️ BeautifulSoup + lxml - HTML 解析
- 📦 MongoDB - 爬虫数据存储
- ⏰ APScheduler - 定时任务调度
- 🔄 Redis - 任务队列和缓存

## ✨ 核心功能

### 🔐 权限管理
- **用户管理** - 用户增删改查、密码策略、账号锁定
- **角色管理** - 角色分配、权限绑定、动态路由
- **权限管理** - 菜单权限、按钮权限、数据权限
- **部门管理** - 组织架构、部门层级
- **岗位管理** - 岗位配置、人员分配
- **用户组管理** - 用户分组、批量授权

### 🛡️ 安全配置
- **密码策略** - 长度、复杂度、过期时间、历史密码检查
- **账号锁定** - 失败次数限制、自动锁定、解锁机制
- **审计日志** - 操作记录、敏感字段脱敏、日志保留策略
- **配置管理** - 数据库存储、Redis 缓存、动态生效

### 📁 文件管理
- **多存储支持** - 本地存储、AWS S3、阿里云 OSS
- **文件上传** - 拖拽上传、批量上传、断点续传
- **文件预览** - 图片预览、文档预览
- **回收站** - 软删除、恢复、永久删除
- **文件夹管理** - 创建、重命名、移动、删除

### 🕷️ 爬虫系统
- **任务管理** - 创建任务、执行任务、查看结果
- **爬虫注册** - 插件化爬虫、动态加载
- **定时调度** - Cron 表达式、自动执行
- **结果存储** - MongoDB 存储、分页查询
- **通用爬虫** - 支持自定义选择器、配置化爬取

### 🔧 系统工具
- **字典管理** - 系统字典、业务字典
- **定时任务** - Cron 任务、任务日志
- **客户端管理** - 客户端注册、API Key 管理
- **健康检查** - 服务状态监控
- **API 文档** - Swagger 自动生成

## 🎯 项目特色

- ✅ **完整的权限体系** - RBAC 模型，支持菜单权限、按钮权限、数据权限
- ✅ **安全配置中心** - 密码策略、账号锁定、审计日志统一管理
- ✅ **多存储支持** - 本地、S3、OSS 灵活切换
- ✅ **爬虫系统** - 插件化设计，支持自定义爬虫
- ✅ **审计日志** - 完整的操作记录，支持敏感字段脱敏
- ✅ **类型安全** - 前后端全面使用 TypeScript
- ✅ **代码规范** - ESLint + Prettier + Commitlint
- ✅ **Monorepo** - Turborepo 高效构建

## 📦 项目结构

```
.
├── apps/
│   ├── web-naive/          # 前端应用 (Vue 3 + Naive UI)
│   ├── backend/            # 后端服务 (NestJS + MySQL)
│   └── crawler/            # 爬虫服务 (Flask + MongoDB)
├── packages/               # 共享包
├── .kiro/                  # Kiro 配置和规范文档
├── docs/                   # 项目文档
└── scripts/                # 构建脚本
```

## 🚀 快速开始

### 环境要求

- Node.js >= 20.19.0
- pnpm >= 10.0.0
- Python >= 3.11
- MySQL >= 8.0
- MongoDB >= 5.0
- Redis >= 6.0

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd <project-name>

# 安装前端和后端依赖
pnpm install

# 安装爬虫服务依赖
cd apps/crawler
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

### 配置环境变量

```bash
# 后端配置
cp apps/backend/.env.example apps/backend/.env
# 编辑 apps/backend/.env，配置数据库、Redis、JWT 等

# 爬虫配置
cp apps/crawler/.env.example apps/crawler/.env
# 编辑 apps/crawler/.env，配置 MongoDB、Redis 等

# 前端配置
cp apps/web-naive/.env.example apps/web-naive/.env
# 编辑 apps/web-naive/.env，配置 API 地址等
```

### 初始化数据库

```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE pick_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入初始数据
mysql -u root -p pick_admin < apps/backend/init.sql
```

### 启动服务

```bash
# 启动后端服务 (端口 8085)
pnpm dev:backend

# 启动前端服务 (端口 5173)
pnpm dev:naive

# 启动爬虫服务 (端口 5321)
pnpm dev:crawler
```

### 访问应用

- 前端地址: http://localhost:5173
- 后端 API: http://localhost:8085/api/v1
- Swagger 文档: http://localhost:8085/docs
- 爬虫 API: http://localhost:5321/crawler

### 默认账号

**超级管理员**
- 用户名: `admin`
- 密码: `123456`

**普通管理员**
- 用户名: `user`
- 密码: `123456`

> ⚠️ 生产环境请立即修改默认密码！

## 📝 开发指南

### 前端开发

```bash
# 开发模式
pnpm dev:naive

# 类型检查
pnpm check:type

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 构建生产版本
pnpm build:naive
```

### 后端开发

```bash
# 开发模式（热重载）
pnpm dev:backend

# 生产模式
pnpm start:backend

# 生成数据库迁移
cd apps/backend
pnpm migration:generate src/database/migrations/MigrationName

# 运行数据库迁移
pnpm migration:run

# 初始化字典数据
pnpm dict:init
```

### 爬虫开发

```bash
# 开发模式
pnpm dev:crawler

# 或直接运行
cd apps/crawler
source venv/bin/activate
python run.py
```

## 📚 文档

- [前端代码规范](.kiro/steering/frontend-code-standards.md)
- [后端代码规范](.kiro/steering/backend-code-standards.md)
- [爬虫代码规范](.kiro/steering/crawler-code-standards.md)
- [API 对接指南](.kiro/steering/backend-api-integration.md)
- [UI 组件使用规范](.kiro/steering/web-naive-ui-components.md)
- [安全配置系统说明](SECURITY_CONFIG_GUIDE.md)
- [开源准备指南](OPENSOURCE_GUIDE.md)

## 🔒 安全说明

### 密码策略

系统支持灵活的密码策略配置，包括：
- 密码长度限制（6-128 位）
- 复杂度要求（大小写、数字、特殊字符）
- 密码过期策略
- 历史密码检查（防止重复使用）

### 账号锁定

- 登录失败次数限制（默认 5 次）
- 自动锁定时长（默认 30 分钟）
- 支持手动解锁

### 审计日志

- 记录所有关键操作
- 敏感字段自动脱敏
- 支持日志导出和查询
- 自动清理过期日志

### 配置管理

所有安全配置存储在数据库中，通过后台管理界面动态配置，无需重启服务即可生效。详见 [安全配置系统说明](SECURITY_CONFIG_GUIDE.md)。

## 🛠️ 技术亮点

### 前端

- **Monorepo 架构** - Turborepo + pnpm workspace，高效的多包管理
- **组件化开发** - 页面组件化，提高代码复用性
- **类型安全** - 全面使用 TypeScript，减少运行时错误
- **适配器模式** - 统一组件接口，易于切换 UI 库
- **权限指令** - v-access 指令，简化权限控制

### 后端

- **模块化设计** - NestJS 模块化架构，清晰的代码组织
- **依赖注入** - IoC 容器，松耦合设计
- **装饰器模式** - 权限控制、审计日志、参数验证
- **缓存策略** - Redis 多级缓存，提升性能
- **定时任务** - 自动清理过期数据、定时备份

### 爬虫

- **插件化设计** - 爬虫注册机制，易于扩展
- **任务调度** - APScheduler 定时调度
- **数据存储** - MongoDB 灵活存储爬虫结果
- **错误重试** - 自动重试机制，提高成功率

## 🔧 部署

### Docker 部署

```bash
# 构建镜像
pnpm build:docker

# 使用 docker-compose 启动
docker-compose up -d
```

### 传统部署

```bash
# 构建前端
pnpm build:naive

# 构建后端
pnpm build:backend

# 配置 Nginx 反向代理
# 参考 nginx.conf.example
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关

### Pull Request 流程

1. Fork 本仓库
2. 创建特性分支: `git checkout -b feat/xxx`
3. 提交代码: `git commit -m 'feat: add xxx'`
4. 推送分支: `git push origin feat/xxx`
5. 提交 Pull Request

## 📄 许可证

[MIT License](LICENSE)

## 🙏 致谢

本项目基于以下优秀的开源项目：

- [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin) - 前端框架
- [NestJS](https://nestjs.com/) - 后端框架
- [Naive UI](https://www.naiveui.com/) - UI 组件库
- [Flask](https://flask.palletsprojects.com/) - Python Web 框架

感谢所有贡献者的付出！

## 📮 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 [Issue](../../issues)
- 发送邮件至: [wzyaoohu@gmail.com]

---

⭐ 如果这个项目对你有帮助，请给一个 Star 支持一下！
