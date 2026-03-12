---
inclusion: always
---

# 后端代码规范（NestJS）

本文档定义 NestJS 后端代码的编写规范，确保代码质量、可维护性和一致性。

## 1. 项目架构规范

### 1.1 模块结构

每个功能模块应包含以下文件：

```
modules/
└── feature/
    ├── dto/                  # 数据传输对象
    │   ├── index.ts         # 统一导出
    │   ├── create-feature.dto.ts
    │   ├── update-feature.dto.ts
    │   └── query-feature.dto.ts
    ├── entities/            # 实体定义
    │   ├── index.ts
    │   └── feature.entity.ts
    ├── feature.controller.ts
    ├── feature.service.ts
    ├── feature.module.ts
    └── __tests__/           # 测试文件（可选）
```

### 1.2 分层职责

**Controller 层**：
- ✅ 处理 HTTP 请求和响应
- ✅ 参数验证（使用 DTO）
- ✅ 路由定义
- ✅ 权限控制（使用装饰器）
- ❌ 不包含业务逻辑
- ❌ 不直接操作数据库

**Service 层**：
- ✅ 实现业务逻辑
- ✅ 数据库操作
- ✅ 事务处理
- ✅ 数据转换
- ❌ 不处理 HTTP 相关逻辑
- ❌ 不直接访问 Request/Response

**Entity 层**：
- ✅ 定义数据库表结构
- ✅ 定义关系映射
- ✅ 字段验证规则


## 2. Controller 规范

### 2.1 基础结构

```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard, RoleGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';

@ApiTags('功能模块')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard, RoleGuard)
@Controller('feature')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  @Audit({ description: '创建功能', saveReqBody: true })
  @ApiOperation({ summary: '创建功能', description: '详细描述' })
  create(@Body() dto: CreateFeatureDto) {
    return this.featureService.create(dto);
  }
}
```

### 2.2 Controller 规范

**必须遵循：**
- ✅ 使用 `@ApiTags` 标注模块名称
- ✅ 使用 `@ApiOperation` 描述接口功能
- ✅ 使用 `@ApiBearerAuth` 标注需要认证
- ✅ 使用 `@UseGuards` 添加守卫
- ✅ 使用 `@Roles` 控制角色权限
- ✅ 使用 `@Audit` 记录审计日志
- ✅ 使用 DTO 进行参数验证
- ✅ 方法名使用动词（create、update、delete、find）

**禁止：**
- ❌ 不要在 Controller 中编写业务逻辑
- ❌ 不要直接注入 Repository
- ❌ 不要使用 `any` 类型
- ❌ 不要忘记添加权限控制


### 2.3 路由命名规范

**RESTful 风格**：
```typescript
// ✅ 好
@Get()                    // GET /feature
@Get(':id')              // GET /feature/:id
@Post()                  // POST /feature
@Patch(':id')            // PATCH /feature/:id
@Delete(':id')           // DELETE /feature/:id

// ✅ 好 - 子资源
@Get(':id/users')        // GET /feature/:id/users
@Post(':id/users')       // POST /feature/:id/users

// ❌ 不好 - 使用动词
@Get('getAll')
@Post('createNew')
```

### 2.4 参数获取

```typescript
// ✅ 好 - 明确参数来源
@Get(':id')
findOne(@Param('id') id: number) {}

@Get()
findAll(@Query() query: QueryDto) {}

@Post()
create(@Body() dto: CreateDto) {}

@Get('detail')
getDetail(@Request() req: any) {
  const user = req.user;  // 从 JWT 获取用户信息
}

// ❌ 不好 - 使用 any
findOne(@Param() params: any) {}
```


## 3. Service 规范

### 3.1 基础结构

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';

@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(Feature)
    private featureRepo: Repository<Feature>,
  ) {}

  async create(dto: CreateFeatureDto) {
    // 1. 验证数据
    const existing = await this.featureRepo.findOne({
      where: { code: dto.code },
    });
    
    if (existing) {
      throw new CustomException(ErrorCode.ERR_20001, '记录已存在');
    }

    // 2. 创建实体
    const entity = this.featureRepo.create(dto);

    // 3. 保存数据
    return this.featureRepo.save(entity);
  }

  async findAll(query: QueryDto) {
    const { pageNo = 1, pageSize = 10, keyword } = query;

    const queryBuilder = this.featureRepo
      .createQueryBuilder('feature')
      .where('feature.name LIKE :keyword', { keyword: `%${keyword || ''}%` });

    const [data, total] = await queryBuilder
      .orderBy('feature.id', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { pageData: data, total };
  }
}
```

### 3.2 Service 规范

**必须遵循：**
- ✅ 使用 `@Injectable()` 装饰器
- ✅ 使用 `@InjectRepository` 注入 Repository
- ✅ 使用 `async/await` 处理异步操作
- ✅ 使用 `CustomException` 抛出业务异常
- ✅ 使用 QueryBuilder 构建复杂查询
- ✅ 返回明确的类型

**禁止：**
- ❌ 不要使用 `console.log`（使用 Logger）
- ❌ 不要捕获异常后不处理
- ❌ 不要在 Service 中访问 Request 对象
- ❌ 不要使用 `any` 类型


### 3.3 数据库查询规范

**简单查询**：
```typescript
// ✅ 好 - 使用 find
async findAll() {
  return this.repo.find({
    where: { enable: true },
    order: { id: 'DESC' },
  });
}

// ✅ 好 - 使用 findOne
async findById(id: number) {
  const entity = await this.repo.findOne({ where: { id } });
  if (!entity) {
    throw new CustomException(ErrorCode.ERR_20002, '记录不存在');
  }
  return entity;
}
```

**复杂查询**：
```typescript
// ✅ 好 - 使用 QueryBuilder
async findWithFilters(query: QueryDto) {
  const queryBuilder = this.repo
    .createQueryBuilder('entity')
    .leftJoinAndSelect('entity.relation', 'relation');

  if (query.keyword) {
    queryBuilder.andWhere('entity.name LIKE :keyword', {
      keyword: `%${query.keyword}%`,
    });
  }

  if (query.status !== undefined) {
    queryBuilder.andWhere('entity.status = :status', {
      status: query.status,
    });
  }

  return queryBuilder.getMany();
}
```

**分页查询**：
```typescript
// ✅ 好 - 标准分页
async findPagination(query: QueryDto) {
  const { pageNo = 1, pageSize = 10 } = query;

  const [data, total] = await this.repo
    .createQueryBuilder('entity')
    .skip((pageNo - 1) * pageSize)
    .take(pageSize)
    .getManyAndCount();

  return { pageData: data, total };
}
```


### 3.4 关联查询规范

**加载关联数据**：
```typescript
// ✅ 好 - 使用 relations
async findWithRelations(id: number) {
  return this.repo.findOne({
    where: { id },
    relations: { users: true, permissions: true },
  });
}

// ✅ 好 - 使用 leftJoinAndSelect
async findWithJoin(id: number) {
  return this.repo
    .createQueryBuilder('entity')
    .leftJoinAndSelect('entity.users', 'users')
    .leftJoinAndSelect('entity.permissions', 'permissions')
    .where('entity.id = :id', { id })
    .getOne();
}

// ❌ 不好 - N+1 查询问题
async findAll() {
  const entities = await this.repo.find();
  for (const entity of entities) {
    entity.users = await this.userRepo.find({ where: { entityId: entity.id } });
  }
  return entities;
}
```

### 3.5 事务处理

```typescript
// ✅ 好 - 使用事务
async createWithTransaction(dto: CreateDto) {
  return this.repo.manager.transaction(async (manager) => {
    const entity = manager.create(Entity, dto);
    await manager.save(entity);

    const related = manager.create(Related, { entityId: entity.id });
    await manager.save(related);

    return entity;
  });
}

// ✅ 好 - 使用 QueryRunner
async complexTransaction() {
  const queryRunner = this.repo.manager.connection.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    await queryRunner.manager.save(entity1);
    await queryRunner.manager.save(entity2);
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```


## 4. DTO 规范

### 4.1 DTO 定义

```typescript
import { IsString, IsNumber, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeatureDto {
  @ApiProperty({ description: '名称', example: '功能名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: '编码', example: 'FEATURE_CODE' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enable?: boolean;
}
```

### 4.2 DTO 规范

**必须遵循：**
- ✅ 使用 `class-validator` 进行验证
- ✅ 使用 `@ApiProperty` 添加 Swagger 文档
- ✅ 可选字段使用 `@IsOptional()`
- ✅ 字符串字段限制长度
- ✅ 使用明确的类型

**常用验证装饰器**：
```typescript
@IsString()              // 字符串
@IsNumber()              // 数字
@IsBoolean()             // 布尔值
@IsEmail()               // 邮箱
@IsArray()               // 数组
@IsEnum(EnumType)        // 枚举
@MinLength(1)            // 最小长度
@MaxLength(100)          // 最大长度
@Min(0)                  // 最小值
@Max(100)                // 最大值
@IsOptional()            // 可选
@IsNotEmpty()            // 非空
```

### 4.3 DTO 继承

```typescript
// ✅ 好 - 使用 PartialType
import { PartialType } from '@nestjs/mapped-types';

export class UpdateFeatureDto extends PartialType(CreateFeatureDto) {}

// ✅ 好 - 使用 OmitType
import { OmitType } from '@nestjs/mapped-types';

export class CreateUserDto extends OmitType(User, ['id', 'createdAt']) {}

// ✅ 好 - 使用 PickType
import { PickType } from '@nestjs/mapped-types';

export class LoginDto extends PickType(User, ['username', 'password']) {}
```


## 5. Entity 规范

### 5.1 Entity 定义

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';

@Entity()
export class Feature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50, comment: '编码' })
  code: string;

  @Column({ unique: true, length: 50, comment: '名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description: string;

  @Column({ default: true, comment: '是否启用' })
  enable: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', comment: '创建时间' })
  createdAt: Date;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP', 
    onUpdate: 'CURRENT_TIMESTAMP',
    comment: '更新时间' 
  })
  updatedAt: Date;

  @ManyToMany(() => User, (user) => user.features, {
    createForeignKeyConstraints: false,
  })
  @JoinTable({
    name: 'feature_user',
    joinColumn: { name: 'featureId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  users: User[];
}
```

### 5.2 Entity 规范

**必须遵循：**
- ✅ 使用 `@Entity()` 装饰器
- ✅ 使用 `@PrimaryGeneratedColumn()` 定义主键
- ✅ 使用 `@Column()` 定义字段
- ✅ 添加 `comment` 注释
- ✅ 设置合适的字段长度
- ✅ 使用 `nullable` 标记可空字段
- ✅ 使用 `default` 设置默认值
- ✅ 唯一字段使用 `unique: true`

**字段类型选择**：
```typescript
@Column({ type: 'varchar', length: 50 })    // 短字符串
@Column({ type: 'text' })                   // 长文本
@Column({ type: 'int' })                    // 整数
@Column({ type: 'decimal', precision: 10, scale: 2 })  // 金额
@Column({ type: 'boolean', default: true }) // 布尔值
@Column({ type: 'timestamp' })              // 时间戳
@Column({ type: 'json' })                   // JSON 数据
```


### 5.3 关系定义

**一对多关系**：
```typescript
// 一方（父）
@Entity()
export class User {
  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];
}

// 多方（子）
@Entity()
export class Post {
  @ManyToOne(() => User, (user) => user.posts)
  user: User;

  @Column()
  userId: number;
}
```

**多对多关系**：
```typescript
// 主控方
@Entity()
export class Role {
  @ManyToMany(() => Permission, (permission) => permission.roles, {
    createForeignKeyConstraints: false,
  })
  @JoinTable({
    name: 'role_permission',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions: Permission[];
}

// 被控方
@Entity()
export class Permission {
  @ManyToMany(() => Role, (role) => role.permissions, {
    createForeignKeyConstraints: false,
  })
  roles: Role[];
}
```

**自引用关系**：
```typescript
@Entity()
export class Permission {
  @Column({ nullable: true })
  parentId: number;

  @ManyToOne(() => Permission, (permission) => permission.children)
  parent: Permission;

  @OneToMany(() => Permission, (permission) => permission.parent)
  children: Permission[];
}
```


## 6. 错误处理规范

### 6.1 自定义异常

```typescript
// ✅ 好 - 使用 CustomException
import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';

async findById(id: number) {
  const entity = await this.repo.findOne({ where: { id } });
  if (!entity) {
    throw new CustomException(ErrorCode.ERR_20002, '记录不存在');
  }
  return entity;
}

// ✅ 好 - 业务验证
async create(dto: CreateDto) {
  const existing = await this.repo.findOne({ where: { code: dto.code } });
  if (existing) {
    throw new CustomException(ErrorCode.ERR_20001, '编码已存在');
  }
  return this.repo.save(dto);
}

// ❌ 不好 - 使用通用异常
async findById(id: number) {
  const entity = await this.repo.findOne({ where: { id } });
  if (!entity) {
    throw new Error('Not found');
  }
  return entity;
}
```

### 6.2 错误码定义

```typescript
// common/exceptions/error-code.ts
export const ERR = {
  // 通用错误 10xxx
  ERR_10001: { code: 10001, message: '参数错误' },
  ERR_10002: { code: 10002, message: '用户不存在' },
  
  // 权限错误 11xxx
  ERR_11001: { code: 11001, message: '无权限访问' },
  ERR_11002: { code: 11002, message: '角色已禁用' },
  
  // 业务错误 20xxx
  ERR_20001: { code: 20001, message: '记录已存在' },
  ERR_20002: { code: 20002, message: '记录不存在' },
  ERR_20003: { code: 20003, message: '记录被引用，无法删除' },
} as const;

export type ErrInfo = (typeof ERR)[keyof typeof ERR];
```

### 6.3 异常处理

```typescript
// ✅ 好 - 捕获并重新抛出
async complexOperation() {
  try {
    await this.externalService.call();
  } catch (error) {
    throw new CustomException(
      ErrorCode.ERR_20004,
      `外部服务调用失败: ${error.message}`
    );
  }
}

// ✅ 好 - 使用 finally 清理资源
async processFile() {
  const file = await this.openFile();
  try {
    await this.process(file);
  } finally {
    await this.closeFile(file);
  }
}

// ❌ 不好 - 捕获后不处理
async operation() {
  try {
    await this.service.call();
  } catch (error) {
    // 什么都不做
  }
}
```


## 7. 日志规范

### 7.1 Logger 使用

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  async create(dto: CreateDto) {
    this.logger.log(`Creating feature: ${dto.name}`);
    
    try {
      const result = await this.repo.save(dto);
      this.logger.log(`Feature created successfully: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create feature: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

### 7.2 日志级别

```typescript
// ✅ 好 - 使用合适的日志级别
this.logger.log('正常操作日志');           // 一般信息
this.logger.debug('调试信息');             // 调试信息
this.logger.warn('警告信息');              // 警告
this.logger.error('错误信息', error.stack); // 错误

// ❌ 不好 - 使用 console
console.log('日志');
console.error('错误');
```

### 7.3 敏感信息脱敏

```typescript
// ✅ 好 - 脱敏处理
async login(dto: LoginDto) {
  this.logger.log(`User login attempt: ${dto.username}`);
  // 不记录密码
}

// ✅ 好 - 脱敏手机号
const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
this.logger.log(`Phone: ${maskedPhone}`);

// ❌ 不好 - 记录敏感信息
this.logger.log(`Login: ${dto.username}, password: ${dto.password}`);
this.logger.log(`Credit card: ${creditCard}`);
```

### 7.4 结构化日志

```typescript
// ✅ 好 - 结构化日志
this.logger.log({
  action: 'user_login',
  userId: user.id,
  username: user.username,
  ip: request.ip,
  timestamp: new Date().toISOString(),
});

// ✅ 好 - 包含上下文
this.logger.error({
  action: 'payment_failed',
  orderId: order.id,
  amount: order.amount,
  error: error.message,
  stack: error.stack,
});
```


## 8. 依赖注入规范

### 8.1 构造函数注入

```typescript
// ✅ 好 - 使用构造函数注入
@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(Feature)
    private readonly featureRepo: Repository<Feature>,
    private readonly sharedService: SharedService,
    private readonly redisService: RedisService,
  ) {}
}

// ❌ 不好 - 使用属性注入
@Injectable()
export class FeatureService {
  @InjectRepository(Feature)
  private featureRepo: Repository<Feature>;
}
```

### 8.2 循环依赖处理

```typescript
// ✅ 好 - 使用 forwardRef
@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => RoleService))
    private roleService: RoleService,
  ) {}
}

// ✅ 好 - 重构避免循环依赖
// 将共享逻辑提取到独立的 Service
@Injectable()
export class SharedService {
  // 共享逻辑
}
```

### 8.3 可选依赖

```typescript
// ✅ 好 - 使用 @Optional
@Injectable()
export class FeatureService {
  constructor(
    @Optional()
    @Inject('OPTIONAL_SERVICE')
    private optionalService?: OptionalService,
  ) {}
}
```

## 9. 缓存规范

### 9.1 Redis 缓存

```typescript
// ✅ 好 - 使用缓存
async findAll(): Promise<Feature[]> {
  const cacheKey = 'features:all';
  
  try {
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    this.logger.error(`Cache read failed: ${error.message}`);
  }

  const data = await this.repo.find();

  try {
    await this.redisService.set(cacheKey, JSON.stringify(data), 600);
  } catch (error) {
    this.logger.error(`Cache write failed: ${error.message}`);
  }

  return data;
}

// ✅ 好 - 缓存失效
async update(id: number, dto: UpdateDto) {
  await this.repo.update(id, dto);
  await this.invalidateCache();
  return true;
}

private async invalidateCache() {
  await Promise.all([
    this.redisService.del('features:all'),
    this.redisService.del('features:tree'),
  ]);
}
```

### 9.2 缓存键命名

```typescript
// ✅ 好 - 使用命名空间
const cacheKey = `user:${userId}:profile`;
const cacheKey = `role:${roleId}:permissions`;
const cacheKey = `permission:tree`;

// ❌ 不好 - 无命名空间
const cacheKey = userId.toString();
const cacheKey = 'data';
```


## 10. 安全规范

### 10.1 参数验证

```typescript
// ✅ 好 - 使用 DTO 验证
@Post()
create(@Body() dto: CreateFeatureDto) {
  return this.service.create(dto);
}

// ✅ 好 - 使用 ParseIntPipe
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.service.findOne(id);
}

// ❌ 不好 - 不验证参数
@Get(':id')
findOne(@Param('id') id: any) {
  return this.service.findOne(id);
}
```

### 10.2 SQL 注入防护

```typescript
// ✅ 好 - 使用参数化查询
const user = await this.repo
  .createQueryBuilder('user')
  .where('user.username = :username', { username })
  .getOne();

// ❌ 不好 - 字符串拼接
const user = await this.repo
  .createQueryBuilder('user')
  .where(`user.username = '${username}'`)
  .getOne();
```

### 10.3 权限控制

```typescript
// ✅ 好 - 使用装饰器控制权限
@Post()
@Roles('SUPER_ADMIN', 'ADMIN')
@UseGuards(JwtGuard, RoleGuard)
create(@Body() dto: CreateDto) {
  return this.service.create(dto);
}

// ✅ 好 - 验证用户身份
@Patch(':id')
update(@Param('id') id: number, @Request() req: any, @Body() dto: UpdateDto) {
  if (req.user.id !== id) {
    throw new CustomException(ErrorCode.ERR_11001, '无权限修改他人信息');
  }
  return this.service.update(id, dto);
}
```

### 10.4 密码处理

```typescript
import { hashSync, compareSync } from 'bcryptjs';

// ✅ 好 - 加密存储
async create(dto: CreateUserDto) {
  const hashedPassword = hashSync(dto.password, 10);
  const user = this.repo.create({
    ...dto,
    password: hashedPassword,
  });
  return this.repo.save(user);
}

// ✅ 好 - 验证密码
async validatePassword(password: string, hashedPassword: string) {
  return compareSync(password, hashedPassword);
}

// ❌ 不好 - 明文存储
async create(dto: CreateUserDto) {
  return this.repo.save(dto);
}
```


## 11. 性能优化规范

### 11.1 查询优化

```typescript
// ✅ 好 - 只查询需要的字段
async findAll() {
  return this.repo
    .createQueryBuilder('user')
    .select(['user.id', 'user.username', 'user.email'])
    .getMany();
}

// ✅ 好 - 使用索引字段查询
async findByCode(code: string) {
  return this.repo.findOne({ where: { code } });  // code 有索引
}

// ❌ 不好 - 查询所有字段
async findAll() {
  return this.repo.find();  // 包含不需要的大字段
}
```

### 11.2 批量操作

```typescript
// ✅ 好 - 批量插入
async batchCreate(dtos: CreateDto[]) {
  const entities = this.repo.create(dtos);
  return this.repo.save(entities);
}

// ✅ 好 - 批量更新
async batchUpdate(ids: number[], dto: UpdateDto) {
  return this.repo.update({ id: In(ids) }, dto);
}

// ❌ 不好 - 循环单个操作
async batchCreate(dtos: CreateDto[]) {
  const results = [];
  for (const dto of dtos) {
    const result = await this.repo.save(dto);
    results.push(result);
  }
  return results;
}
```

### 11.3 分页优化

```typescript
// ✅ 好 - 使用游标分页（大数据量）
async findWithCursor(cursor: number, limit: number) {
  return this.repo
    .createQueryBuilder('entity')
    .where('entity.id > :cursor', { cursor })
    .orderBy('entity.id', 'ASC')
    .take(limit)
    .getMany();
}

// ✅ 好 - 使用偏移分页（小数据量）
async findWithOffset(page: number, pageSize: number) {
  return this.repo
    .createQueryBuilder('entity')
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getManyAndCount();
}
```

### 11.4 避免 N+1 查询

```typescript
// ✅ 好 - 使用 join 一次查询
async findAllWithRelations() {
  return this.repo
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.roles', 'roles')
    .leftJoinAndSelect('roles.permissions', 'permissions')
    .getMany();
}

// ❌ 不好 - N+1 查询
async findAllWithRelations() {
  const users = await this.repo.find();
  for (const user of users) {
    user.roles = await this.roleRepo.find({ where: { userId: user.id } });
    for (const role of user.roles) {
      role.permissions = await this.permissionRepo.find({ 
        where: { roleId: role.id } 
      });
    }
  }
  return users;
}
```


## 12. 命名规范

### 12.1 文件命名

```
✅ 好
user.controller.ts
user.service.ts
user.module.ts
create-user.dto.ts
user.entity.ts

❌ 不好
UserController.ts
userService.ts
CreateUserDTO.ts
```

### 12.2 类命名

```typescript
// ✅ 好 - PascalCase
export class UserController {}
export class UserService {}
export class CreateUserDto {}
export class User {}

// ❌ 不好
export class userController {}
export class user_service {}
```

### 12.3 方法命名

```typescript
// ✅ 好 - camelCase，动词开头
async create() {}
async findAll() {}
async findOne() {}
async update() {}
async remove() {}
async validateUser() {}
async generateToken() {}

// ❌ 不好
async Create() {}
async get_all() {}
async user() {}
```

### 12.4 变量命名

```typescript
// ✅ 好 - camelCase，语义明确
const userId = 1;
const userName = 'admin';
const isActive = true;
const hasPermission = false;
const userList = [];
const pageSize = 10;

// ❌ 不好
const id = 1;
const name = 'admin';
const flag = true;
const list = [];
const size = 10;
```

### 12.5 常量命名

```typescript
// ✅ 好 - UPPER_SNAKE_CASE
export const ACCESS_TOKEN_EXPIRATION_TIME = 3600;
export const MAX_LOGIN_ATTEMPTS = 5;
export const DEFAULT_PAGE_SIZE = 10;

// ✅ 好 - 使用对象组织常量
export const ROLE_CONSTANTS = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

// ❌ 不好
export const accessTokenExpirationTime = 3600;
export const maxLoginAttempts = 5;
```


## 13. 注释规范

### 13.1 类注释

```typescript
/**
 * 用户服务
 * 提供用户的增删改查功能
 */
@Injectable()
export class UserService {}
```

### 13.2 方法注释

**简单方法 - 不需要注释**：
```typescript
// ✅ 好 - 方法名已经说明了作用
async findAll() {
  return this.repo.find();
}

async create(dto: CreateDto) {
  return this.repo.save(dto);
}
```

**复杂方法 - 需要注释**：
```typescript
// ✅ 好
/**
 * 递归查找所有子权限
 * @param parentId 父权限ID
 * @returns 所有子权限列表（包括子孙权限）
 */
private async findAllDescendants(parentId: number): Promise<Permission[]> {
  const children = await this.repo.find({ where: { parentId } });
  if (children.length === 0) return [];

  const descendants: Permission[] = [...children];
  for (const child of children) {
    const childDescendants = await this.findAllDescendants(child.id);
    descendants.push(...childDescendants);
  }

  return descendants;
}
```

### 13.3 注释原则

**必须遵循：**
- ✅ 代码应该自解释，优先使用清晰的命名
- ✅ 只为复杂逻辑添加注释
- ✅ 注释说明"为什么"而不是"做什么"
- ✅ 保持注释与代码同步

**禁止：**
- ❌ 不要为显而易见的代码添加注释
- ❌ 不要保留注释掉的代码
- ❌ 不要写过时的注释

```typescript
// ❌ 不好 - 显而易见的注释
// 查找用户
async findUser(id: number) {
  return this.repo.findOne({ where: { id } });
}

// ✅ 好 - 解释为什么
// 超级管理员自动拥有所有权限，无需查询数据库
if (role.code === ROLE_CONSTANTS.SUPER_ADMIN) {
  return this.permissionRepo.find();
}
```


## 14. 代码组织规范

### 14.1 Service 方法顺序

```typescript
@Injectable()
export class FeatureService {
  // 1. 构造函数
  constructor(
    @InjectRepository(Feature)
    private readonly featureRepo: Repository<Feature>,
  ) {}

  // 2. 公共方法（按 CRUD 顺序）
  async create(dto: CreateDto) {}
  
  async findAll(query: QueryDto) {}
  
  async findOne(id: number) {}
  
  async update(id: number, dto: UpdateDto) {}
  
  async remove(id: number) {}

  // 3. 其他公共方法
  async batchCreate(dtos: CreateDto[]) {}
  
  async validateCode(code: string) {}

  // 4. 私有方法
  private async findDescendants(id: number) {}
  
  private async invalidateCache() {}
}
```

### 14.2 导入顺序

```typescript
// 1. Node.js 内置模块
import { readFile } from 'fs/promises';

// 2. 第三方模块
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// 3. 项目内部模块（使用别名）
import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { SharedService } from '@/shared/shared.service';
import { User } from '@/modules/user/entities';

// 4. 相对路径导入
import { CreateFeatureDto, UpdateFeatureDto } from './dto';
import { Feature } from './entities';
```

### 14.3 模块导出

```typescript
// dto/index.ts
// ✅ 好 - 统一导出
export { CreateFeatureDto } from './create-feature.dto';
export { UpdateFeatureDto } from './update-feature.dto';
export { QueryFeatureDto } from './query-feature.dto';

// ❌ 不好 - 使用 export *
export * from './create-feature.dto';
```


## 15. 类型安全规范

### 15.1 避免使用 any

```typescript
// ✅ 好 - 使用明确类型
async findAll(query: QueryDto): Promise<Feature[]> {
  return this.repo.find();
}

// ✅ 好 - 使用泛型
async findById<T>(id: number): Promise<T> {
  return this.repo.findOne({ where: { id } }) as T;
}

// ❌ 不好 - 使用 any
async findAll(query: any): Promise<any> {
  return this.repo.find();
}
```

### 15.2 类型断言

```typescript
// ✅ 好 - 使用 as 断言
const user = result as User;

// ✅ 好 - 使用类型守卫
function isUser(obj: any): obj is User {
  return obj && typeof obj.username === 'string';
}

if (isUser(data)) {
  console.log(data.username);
}

// ❌ 不好 - 使用 <> 断言（与 JSX 冲突）
const user = <User>result;
```

### 15.3 可选链和空值合并

```typescript
// ✅ 好 - 使用可选链
const userName = user?.profile?.name;
const roleCode = user?.roles?.[0]?.code;

// ✅ 好 - 使用空值合并
const pageSize = query.pageSize ?? 10;
const keyword = query.keyword ?? '';

// ❌ 不好 - 使用 || （会把 0、false 当作空值）
const pageSize = query.pageSize || 10;
```

## 16. 环境配置规范

### 16.1 配置文件

```typescript
// ✅ 好 - 使用 ConfigService
@Injectable()
export class AuthService {
  constructor(private configService: ConfigService) {}

  getJwtSecret() {
    return this.configService.get<string>('JWT_SECRET');
  }

  getDatabaseUrl() {
    return this.configService.get<string>('DATABASE_URL');
  }
}

// ❌ 不好 - 直接使用 process.env
const jwtSecret = process.env.JWT_SECRET;
```

### 16.2 环境变量验证

```typescript
// ✅ 好 - 使用 Joi 验证
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
});
```


## 17. 测试规范

### 17.1 单元测试

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeatureService } from './feature.service';
import { Feature } from './entities';

describe('FeatureService', () => {
  let service: FeatureService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureService,
        {
          provide: getRepositoryToken(Feature),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FeatureService>(FeatureService);
  });

  describe('findAll', () => {
    it('should return an array of features', async () => {
      const features = [{ id: 1, name: 'Feature 1' }];
      mockRepository.find.mockResolvedValue(features);

      const result = await service.findAll();

      expect(result).toEqual(features);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a new feature', async () => {
      const dto = { name: 'New Feature', code: 'NEW' };
      const savedFeature = { id: 1, ...dto };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(dto);
      mockRepository.save.mockResolvedValue(savedFeature);

      const result = await service.create(dto);

      expect(result).toEqual(savedFeature);
      expect(mockRepository.save).toHaveBeenCalledWith(dto);
    });

    it('should throw error if feature already exists', async () => {
      const dto = { name: 'Existing', code: 'EXIST' };
      mockRepository.findOne.mockResolvedValue({ id: 1 });

      await expect(service.create(dto)).rejects.toThrow();
    });
  });
});
```

### 17.2 测试规范

**必须遵循：**
- ✅ 使用 `describe` 组织测试用例
- ✅ 使用 `it` 或 `test` 描述测试场景
- ✅ 使用 `beforeEach` 初始化测试环境
- ✅ 使用 Mock 隔离依赖
- ✅ 测试正常流程和异常流程
- ✅ 测试名称清晰描述测试内容

**测试覆盖率要求**：
- 核心业务逻辑：80% 以上
- 工具函数：90% 以上
- Controller：60% 以上


## 18. 最佳实践总结

### 18.1 DO（应该做的）

**架构设计**：
- ✅ 遵循单一职责原则
- ✅ 使用依赖注入
- ✅ 分层清晰（Controller、Service、Repository）
- ✅ 使用 DTO 进行数据传输
- ✅ 使用 Entity 定义数据模型

**代码质量**：
- ✅ 使用 TypeScript 严格模式
- ✅ 使用明确的类型定义
- ✅ 编写单元测试
- ✅ 使用 ESLint 和 Prettier
- ✅ 代码审查

**安全性**：
- ✅ 参数验证
- ✅ 权限控制
- ✅ 密码加密
- ✅ SQL 注入防护
- ✅ 敏感信息脱敏

**性能优化**：
- ✅ 使用缓存
- ✅ 避免 N+1 查询
- ✅ 批量操作
- ✅ 分页查询
- ✅ 索引优化

**可维护性**：
- ✅ 清晰的命名
- ✅ 适当的注释
- ✅ 统一的代码风格
- ✅ 模块化设计
- ✅ 文档完善

### 18.2 DON'T（不应该做的）

**代码质量**：
- ❌ 使用 `any` 类型
- ❌ 使用 `console.log`
- ❌ 捕获异常后不处理
- ❌ 在 Controller 中编写业务逻辑
- ❌ 直接在 Controller 中注入 Repository

**安全性**：
- ❌ 不验证用户输入
- ❌ 明文存储密码
- ❌ 记录敏感信息
- ❌ 使用字符串拼接 SQL
- ❌ 忘记权限控制

**性能**：
- ❌ 循环中执行数据库查询
- ❌ 查询所有字段
- ❌ 不使用索引
- ❌ 不使用缓存
- ❌ 不分页查询大数据

**可维护性**：
- ❌ 使用魔法数字
- ❌ 过长的方法
- ❌ 过深的嵌套
- ❌ 重复代码
- ❌ 不写注释（复杂逻辑）

## 19. 参考资源

- [NestJS 官方文档](https://docs.nestjs.com/)
- [TypeORM 官方文档](https://typeorm.io/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Node.js 最佳实践](https://github.com/goldbergyoni/nodebestpractices)

---

**注意**: 本文档会随着项目发展持续更新，请定期查看最新版本。
