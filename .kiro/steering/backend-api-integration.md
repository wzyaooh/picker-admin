---
inclusion: always
---

# 后端接口对接前端项目完整方案

本文档提供后端 NestJS API 对接前端 web-naive 项目的完整方案和最佳实践。

## 一、接口对接架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────┐
│  前端 (web-naive)                                │
│  ├─ views/          业务页面                     │
│  ├─ api/            API 接口定义                 │
│  │   ├─ core/       核心接口（auth, user等）     │
│  │   └─ modules/    业务模块接口                 │
│  ├─ adapter/        适配器层                     │
│  └─ store/          状态管理                     │
└─────────────────────────────────────────────────┘
                      ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────┐
│  后端 (NestJS)                                   │
│  ├─ auth/           认证模块                     │
│  ├─ user/           用户模块                     │
│  ├─ role/           角色模块                     │
│  ├─ permission/     权限模块                     │
│  ├─ audit/          审计日志模块                 │
│  ├─ department/     部门模块                     │
│  ├─ position/       岗位模块                     │
│  ├─ user-group/     用户组模块                   │
│  ├─ dict/           字典模块                     │
│  ├─ file/           文件管理模块                 │
│  ├─ client/         客户端模块                   │
│  ├─ scheduled-task/ 定时任务模块                 │
│  ├─ security-config/安全配置模块                 │
│  ├─ sms-config/     短信配置模块                 │
│  ├─ health/         健康检查模块                 │
│  └─ cleanup/        清理模块                     │
└─────────────────────────────────────────────────┘
```

### 1.2 接口规范

**后端接口基础路径**: `/api`
**认证方式**: Bearer Token (JWT)
**响应格式**: 统一 JSON 格式

```typescript
// 成功响应
{
  code: 0,
  data: any,
  message: 'OK',
  originUrl: string
}

// 错误响应
{
  code: number,
  message: string,
  error?: string
}
```

## 二、API 模块划分

### 2.1 核心模块 (core/)

核心模块包含认证、用户、菜单等基础功能。

#### 文件结构
```
api/core/
├── index.ts          # 统一导出
├── auth.ts           # 认证接口
├── user.ts           # 用户接口
└── menu.ts           # 菜单接口
```

### 2.2 业务模块 (modules/)

业务模块包含角色、权限、审计等功能。

#### 文件结构
```
api/modules/
├── index.ts          # 统一导出
├── role.ts           # 角色接口
├── permission.ts     # 权限接口
├── audit.ts          # 审计日志接口
├── department.ts     # 部门接口
├── position.ts       # 岗位接口
├── user-group.ts     # 用户组接口
├── dict.ts           # 字典接口
├── file.ts           # 文件管理接口
├── storage-config.ts # 存储配置接口
├── client.ts         # 客户端接口
├── client-user.ts    # 客户端用户接口
├── menu.ts           # 菜单接口（业务）
├── scheduled-task.ts # 定时任务接口
├── security-config.ts# 安全配置接口
├── sms-config.ts     # 短信配置接口
└── email-config.ts   # 邮件配置接口
```

## 三、接口实现规范

### 3.1 接口文件模板

每个接口文件应包含：
1. TypeScript 类型定义
2. API 函数实现
3. JSDoc 注释


**示例模板**:
```typescript
import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================
export namespace ModuleApi {
  /** 请求参数类型 */
  export interface RequestParams {
    id: number;
    name: string;
  }

  /** 响应数据类型 */
  export interface ResponseData {
    id: number;
    name: string;
    createdAt: string;
  }

  /** 列表查询参数 */
  export interface QueryParams {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }

  /** 分页响应 */
  export interface PageResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
  }
}

// ==================== API 函数 ====================

/**
 * 获取列表
 * @param params 查询参数
 */
export async function getListApi(params: ModuleApi.QueryParams) {
  return requestClient.get<ModuleApi.PageResult<ModuleApi.ResponseData>>(
    '/module/list',
    { params }
  );
}

/**
 * 创建记录
 * @param data 创建数据
 */
export async function createApi(data: ModuleApi.RequestParams) {
  return requestClient.post<ModuleApi.ResponseData>('/module', data);
}

/**
 * 更新记录
 * @param id 记录ID
 * @param data 更新数据
 */
export async function updateApi(id: number, data: Partial<ModuleApi.RequestParams>) {
  return requestClient.patch<ModuleApi.ResponseData>(`/module/${id}`, data);
}

/**
 * 删除记录
 * @param id 记录ID
 */
export async function deleteApi(id: number) {
  return requestClient.delete<boolean>(`/module/${id}`);
}
```

### 3.2 命名规范

**API 函数命名**:
- 查询列表: `getXxxListApi` 或 `getAllXxxApi`
- 查询单个: `getXxxApi` 或 `getXxxByIdApi`
- 创建: `createXxxApi`
- 更新: `updateXxxApi`
- 删除: `deleteXxxApi` 或 `removeXxxApi`
- 批量操作: `batchXxxApi`

**类型命名**:
- 请求参数: `XxxParams` 或 `XxxDto`
- 响应数据: `XxxResult` 或 `XxxData`
- 查询参数: `QueryXxxParams` 或 `GetXxxDto`

### 3.3 请求方法选择

- `GET`: 查询数据（幂等）
- `POST`: 创建资源、复杂查询
- `PATCH`: 部分更新资源
- `PUT`: 完整更新资源
- `DELETE`: 删除资源

## 四、现有后端接口映射

### 4.1 认证模块 (auth)

| 功能 | 方法 | 路径 | 前端 API |
|------|------|------|----------|
| 用户登录 | POST | /auth/login | loginApi |
| 用户注册 | POST | /auth/register | registerApi |
| 刷新令牌 | GET | /auth/refresh/token | refreshTokenApi |
| 用户登出 | POST | /auth/logout | logoutApi |
| 获取验证码 | GET | /auth/captcha | getCaptchaApi |
| 修改密码 | POST | /auth/password | changePasswordApi |
| 切换角色 | POST | /auth/current-role/switch/:roleCode | switchRoleApi |
| 获取权限码 | GET | /auth/codes | getAccessCodesApi |

### 4.2 用户模块 (user)

| 功能 | 方法 | 路径 | 前端 API |
|------|------|------|----------|
| 创建用户 | POST | /user | createUserApi |
| 查询用户列表 | GET | /user | getUserListApi |
| 获取当前用户 | GET | /user/detail | getUserInfoApi |
| 根据用户名查询 | GET | /user/:username | getUserByUsernameApi |
| 更新用户 | PATCH | /user/:id | updateUserApi |
| 更新个人资料 | PATCH | /user/profile/:id | updateProfileApi |
| 删除用户 | DELETE | /user/:id | deleteUserApi |

### 4.3 角色模块 (role)

| 功能 | 方法 | 路径 | 前端 API |
|------|------|------|----------|
| 创建角色 | POST | /role | createRoleApi |
| 查询所有角色 | GET | /role | getAllRolesApi |
| 分页查询角色 | GET | /role/page | getRolePageApi |
| 查询角色详情 | GET | /role/:id | getRoleApi |
| 更新角色 | PATCH | /role/:id | updateRoleApi |
| 删除角色 | DELETE | /role/:id | deleteRoleApi |
| 查询角色权限 | GET | /role/permissions | getRolePermissionsApi |
| 分配角色权限 | POST | /role/permissions/add | addRolePermissionsApi |
| 查询权限树 | GET | /role/permissions/tree | getRolePermissionsTreeApi |
| 分配角色用户 | PATCH | /role/users/add/:roleId | addRoleUsersApi |
| 取消角色用户 | PATCH | /role/users/remove/:roleId | removeRoleUsersApi |

### 4.4 权限模块 (permission)

| 功能 | 方法 | 路径 | 前端 API |
|------|------|------|----------|
| 创建权限 | POST | /permission | createPermissionApi |
| 批量创建权限 | POST | /permission/batch | batchCreatePermissionApi |
| 查询所有权限 | GET | /permission | getAllPermissionsApi |
| 查询权限树 | GET | /permission/tree | getPermissionTreeApi |
| 查询菜单树 | GET | /permission/menu/tree | getMenuTreeApi |
| 查询权限详情 | GET | /permission/:id | getPermissionApi |
| 更新权限 | PATCH | /permission/:id | updatePermissionApi |
| 删除权限 | DELETE | /permission/:id | deletePermissionApi |
| 查询按钮权限 | GET | /permission/button/:parentId | getButtonPermissionsApi |
| 校验菜单路径 | GET | /permission/menu/validate | validateMenuPathApi |

### 4.5 审计日志模块 (audit)

| 功能 | 方法 | 路径 | 前端 API |
|------|------|------|----------|
| 查询审计日志 | GET | /audit | getAuditLogsApi |
| 查询日志详情 | GET | /audit/:id | getAuditLogApi |

## 五、实施步骤

### 步骤 1: 创建 API 目录结构

```bash
apps/web-naive/src/api/
├── core/
│   ├── index.ts
│   ├── auth.ts
│   ├── user.ts
│   └── menu.ts
├── modules/
│   ├── index.ts
│   ├── role.ts
│   ├── permission.ts
│   ├── audit.ts
│   ├── department.ts
│   ├── position.ts
│   ├── user-group.ts
│   ├── dict.ts
│   ├── file.ts
│   ├── storage-config.ts
│   ├── client.ts
│   ├── client-user.ts
│   ├── menu.ts
│   ├── scheduled-task.ts
│   ├── security-config.ts
│   ├── sms-config.ts
│   └── email-config.ts
├── index.ts
└── request.ts
```

### 步骤 2: 实现核心接口

按照模板实现 `auth.ts`、`user.ts`、`menu.ts`。

### 步骤 3: 实现业务模块接口

按照模板实现 `role.ts`、`permission.ts`、`audit.ts`。

### 步骤 4: 创建类型定义文件（可选）

```typescript
// api/types/index.ts
export interface PageParams {
  page?: number;
  pageSize?: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}
```

### 步骤 5: 更新统一导出

```typescript
// api/index.ts
export * from './core';
export * from './modules';
```

## 六、最佳实践

### 6.1 错误处理

使用统一的错误处理机制（已在 `request.ts` 中配置）：

```typescript
// 错误会自动通过 message.error 提示
// 无需在每个 API 调用处单独处理
try {
  const data = await getUserListApi(params);
  // 处理成功逻辑
} catch (error) {
  // 错误已被拦截器处理，这里可以做额外处理
}
```

### 6.2 Loading 状态

```typescript
const loading = ref(false);

async function fetchData() {
  loading.value = true;
  try {
    const data = await getDataApi();
    // 处理数据
  } finally {
    loading.value = false;
  }
}
```

### 6.3 分页查询

```typescript
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

async function fetchList() {
  const { items, total } = await getListApi({
    page: pagination.page,
    pageSize: pagination.pageSize,
  });
  
  data.value = items;
  pagination.total = total;
}
```

### 6.4 表单提交

```typescript
async function handleSubmit(values: any) {
  try {
    if (isEdit.value) {
      await updateApi(editId.value, values);
      message.success('更新成功');
    } else {
      await createApi(values);
      message.success('创建成功');
    }
    
    // 刷新列表
    await fetchList();
    
    // 关闭弹窗
    visible.value = false;
  } catch (error) {
    // 错误已被拦截器处理
  }
}
```

### 6.5 删除确认

```typescript
import { dialog } from '#/adapter/naive';

function handleDelete(id: number) {
  dialog.warning({
    title: '确认删除',
    content: '此操作不可恢复，确定要删除吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      await deleteApi(id);
      message.success('删除成功');
      await fetchList();
    },
  });
}
```

## 七、类型安全

### 7.1 使用 TypeScript 严格模式

确保 `tsconfig.json` 启用严格模式：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 7.2 为所有 API 定义类型

```typescript
// ✅ 推荐：明确的类型定义
export async function getUserApi(id: number): Promise<UserInfo> {
  return requestClient.get<UserInfo>(`/user/${id}`);
}

// ❌ 避免：使用 any
export async function getUserApi(id: any): Promise<any> {
  return requestClient.get(`/user/${id}`);
}
```

### 7.3 使用命名空间组织类型

```typescript
export namespace UserApi {
  export interface User {
    id: number;
    username: string;
    email: string;
  }
  
  export interface CreateParams {
    username: string;
    password: string;
    email: string;
  }
}
```

## 八、测试建议

### 8.1 API 测试

使用 Postman 或类似工具测试后端接口：

1. 测试认证流程（登录、刷新令牌）
2. 测试 CRUD 操作
3. 测试权限控制
4. 测试错误场景

### 8.2 前端集成测试

1. 测试 API 调用是否正常
2. 测试错误提示是否正确
3. 测试 Loading 状态
4. 测试数据更新后的 UI 刷新

## 九、常见问题

### 9.1 跨域问题

开发环境已配置代理（`vite.config.mts`）：

```typescript
server: {
  proxy: {
    '/api': {
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
      target: 'http://localhost:8085',
      ws: true,
    },
    '/files': {
      changeOrigin: true,
      target: 'http://localhost:8085',
    },
  },
}
```

后端全局前缀为 `api/v1`，前端 `/api` 路径会被重写为 `/api/v1` 转发到后端 8085 端口。
生产环境需要后端配置 CORS 或使用 Nginx 反向代理。

### 9.2 Token 过期处理

已在 `request.ts` 中配置自动刷新：

```typescript
authenticateResponseInterceptor({
  client,
  doReAuthenticate,
  doRefreshToken,
  enableRefreshToken: preferences.app.enableRefreshToken,
  formatToken,
})
```

### 9.3 请求取消

对于需要取消的请求，使用 AbortController：

```typescript
const controller = new AbortController();

async function fetchData() {
  try {
    const data = await requestClient.get('/data', {
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('请求已取消');
    }
  }
}

// 取消请求
controller.abort();
```

## 十、参考资源

- [Axios 文档](https://axios-http.com/)
- [NestJS 文档](https://docs.nestjs.com/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Vben Request 文档](https://doc.vben.pro/)

---

**注意**: 本文档会随着项目发展持续更新，请定期查看最新版本。
