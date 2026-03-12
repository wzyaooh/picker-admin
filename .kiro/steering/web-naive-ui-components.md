---
inclusion: always
---

# Web-Naive UI 组件使用规范

本文档定义了 web-naive 项目中 UI 组件的使用标准和最佳实践。所有前端页面开发都应遵循此规范。

## 项目 UI 架构概览

web-naive 采用多层次、模块化的 UI 组件体系：

```
┌─────────────────────────────────────┐
│   业务组件（views/）                  │
├─────────────────────────────────────┤
│   Vben 通用组件（@vben/common-ui）    │
├─────────────────────────────────────┤
│   适配器层（adapter/）                │
│   - Naive UI 适配                    │
│   - VXE Table 适配                   │
│   - Form 适配                        │
└─────────────────────────────────────┘
```

## 1. Naive UI（主要 UI 组件库）

Naive UI 是项目的核心 UI 组件库，提供完整的组件生态。

### 1.1 表单组件

```typescript
import {
  NInput,           // 输入框
  NInputNumber,     // 数字输入
  NSelect,          // 选择器
  NTreeSelect,      // 树形选择器
  NDatePicker,      // 日期选择器
  NTimePicker,      // 时间选择器
  NCheckbox,        // 复选框
  NCheckboxGroup,   // 复选框组
  NRadio,           // 单选框
  NRadioGroup,      // 单选框组
  NRadioButton,     // 单选按钮
  NSwitch,          // 开关
  NUpload,          // 上传
} from 'naive-ui';
```

**使用示例**：
```vue
<template>
  <NInput v-model:value="formData.name" placeholder="请输入名称" />
  <NSelect v-model:value="formData.type" :options="typeOptions" />
  <NDatePicker v-model:value="formData.date" type="date" />
</template>
```

### 1.2 数据展示组件

```typescript
import {
  NDataTable,       // 数据表格
  NCard,            // 卡片
  NTag,             // 标签
  NImage,           // 图片
  NTabs,            // 标签页
  NTabPane,         // 标签页面板
} from 'naive-ui';
```

**使用示例**：
```vue
<template>
  <NCard title="数据列表">
    <NDataTable :columns="columns" :data="data" />
  </NCard>
</template>

<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui';
import { NDataTable, NCard } from 'naive-ui';

const columns: DataTableColumns = [
  { title: '名称', key: 'name' },
  { title: '状态', key: 'status' },
];
</script>
```

### 1.3 反馈组件

```typescript
import {
  NButton,          // 按钮
  NMessage,         // 消息提示
  NNotification,    // 通知
  NDialog,          // 对话框
  NModal,           // 模态框
  NLoadingBar,      // 加载条
} from 'naive-ui';
```

**使用全局 API**（推荐）：
```typescript
import { message, notification, dialog, modal, loadingBar } from '#/adapter/naive';

// 消息提示
message.success('操作成功');
message.error('操作失败');
message.warning('警告信息');

// 通知
notification.success({
  content: '操作成功',
  description: '数据已保存',
  duration: 3000,
});

// 对话框
dialog.warning({
  title: '确认删除',
  content: '此操作不可恢复',
  positiveText: '确定',
  negativeText: '取消',
  onPositiveClick: () => {
    // 确认操作
  },
});
```

### 1.4 布局组件

```typescript
import {
  NSpace,           // 间距
  NDivider,         // 分割线
  NConfigProvider,  // 全局配置
} from 'naive-ui';
```

### 1.5 主题配置

项目已在 `app.vue` 中配置全局主题：

```vue
<template>
  <NConfigProvider
    :date-locale="tokenDateLocale"
    :locale="tokenLocale"
    :theme="tokenTheme"
    :theme-overrides="themeOverrides"
  >
    <NNotificationProvider>
      <NMessageProvider>
        <RouterView />
      </NMessageProvider>
    </NNotificationProvider>
  </NConfigProvider>
</template>
```

- 支持亮色/暗色主题自动切换
- 支持中文/英文国际化
- 自定义主题覆盖配置

## 2. VXE Table（高级表格组件）

用于复杂的数据表格场景，提供高性能虚拟滚动和丰富的功能。

### 2.1 基础使用

```typescript
import { useVbenVxeGrid } from '#/adapter/vxe-table';

const [Grid, gridApi] = useVbenVxeGrid({
  columns: [
    { field: 'name', title: '名称' },
    { field: 'status', title: '状态' },
  ],
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        const res = await fetchData(page);
        return res;
      },
    },
  },
});
```

### 2.2 自定义单元格渲染

项目已配置两个自定义渲染器：

**图片渲染器**：
```typescript
{
  field: 'avatar',
  title: '头像',
  cellRender: { name: 'CellImage' }
}
```

**链接渲染器**：
```typescript
{
  field: 'link',
  title: '链接',
  cellRender: { 
    name: 'CellLink',
    props: { text: '查看详情' }
  }
}
```

### 2.3 全局配置

VXE Table 已在 `adapter/vxe-table.ts` 中配置：
- 居中对齐
- 无边框
- 列可调整大小
- 自动加载数据
- 显示溢出内容

## 3. @vben/common-ui（Vben 自研组件）

Vben Admin 框架提供的业务组件库，包含常用的后台管理功能组件。

### 3.1 认证相关组件

```typescript
import {
  AuthenticationLogin,              // 登录页面
  AuthenticationCodeLogin,          // 验证码登录
  AuthenticationQrCodeLogin,        // 二维码登录
  AuthenticationRegister,           // 注册页面
  AuthenticationForgetPassword,     // 忘记密码
  AuthenticationLoginExpiredModal,  // 登录过期模态框
  SliderCaptcha,                    // 滑块验证码
} from '@vben/common-ui';
```

**使用示例**：
```vue
<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    @submit="handleLogin"
  />
</template>

<script setup lang="ts">
import type { VbenFormSchema } from '@vben/common-ui';
import { AuthenticationLogin, z } from '@vben/common-ui';

const formSchema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: { placeholder: '请输入用户名' },
    fieldName: 'username',
    label: '用户名',
    rules: z.string().min(1, { message: '请输入用户名' }),
  },
  {
    component: 'Input',
    componentProps: { 
      placeholder: '请输入密码',
      type: 'password',
    },
    fieldName: 'password',
    label: '密码',
    rules: z.string().min(6, { message: '密码至少6位' }),
  },
];

const handleLogin = async (values: any) => {
  // 登录逻辑
};
</script>
```

### 3.2 个人资料组件

```typescript
import {
  Profile,                      // 个人资料主页
  ProfileBaseSetting,           // 基础设置
  ProfilePasswordSetting,       // 密码设置
  ProfileSecuritySetting,       // 安全设置
  ProfileNotificationSetting,   // 通知设置
} from '@vben/common-ui';
```

### 3.3 错误页面组件

```typescript
import { Fallback } from '@vben/common-ui';
```

**使用示例**：
```vue
<template>
  <!-- 404 页面 -->
  <Fallback status="404" />
  
  <!-- 403 页面 -->
  <Fallback status="403" />
  
  <!-- 500 页面 -->
  <Fallback status="500" />
  
  <!-- 离线页面 -->
  <Fallback status="offline" />
  
  <!-- 即将上线 -->
  <Fallback status="coming-soon" />
</template>
```

### 3.4 其他组件

```typescript
import {
  About,                  // 关于页面
  IconPicker,             // 图标选择器
  ApiComponent,           // API 数据组件
  AnalysisOverviewItem,   // 分析概览项
} from '@vben/common-ui';
```

## 4. 表单系统（VbenForm）

项目使用 Vben 的表单系统，已在 `adapter/form.ts` 中配置。

### 4.1 基础使用

```typescript
import { useVbenForm, z } from '#/adapter/form';
import type { VbenFormSchema } from '#/adapter/form';

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Input',
      componentProps: { placeholder: '请输入名称' },
      fieldName: 'name',
      label: '名称',
      rules: z.string().min(1, { message: '请输入名称' }),
    },
    {
      component: 'Select',
      componentProps: { 
        placeholder: '请选择类型',
        options: [
          { label: '类型1', value: '1' },
          { label: '类型2', value: '2' },
        ],
      },
      fieldName: 'type',
      label: '类型',
      rules: 'selectRequired',
    },
    {
      component: 'DatePicker',
      componentProps: { type: 'date' },
      fieldName: 'date',
      label: '日期',
    },
  ],
});
```

### 4.2 可用组件类型

```typescript
type ComponentType =
  | 'Input'           // 输入框
  | 'InputNumber'     // 数字输入
  | 'Select'          // 选择器
  | 'ApiSelect'       // API 选择器
  | 'TreeSelect'      // 树形选择器
  | 'ApiTreeSelect'   // API 树形选择器
  | 'DatePicker'      // 日期选择器
  | 'TimePicker'      // 时间选择器
  | 'Checkbox'        // 复选框
  | 'CheckboxGroup'   // 复选框组
  | 'RadioGroup'      // 单选框组
  | 'Switch'          // 开关
  | 'Upload'          // 上传
  | 'IconPicker'      // 图标选择器
  | 'Divider'         // 分割线
  | 'Space'           // 间距
  | 'DefaultButton'   // 默认按钮
  | 'PrimaryButton';  // 主要按钮
```

### 4.3 表单验证规则

项目已配置两个全局验证规则：

```typescript
// 必填验证
rules: 'required'

// 选择器必选验证
rules: 'selectRequired'

// 自定义 Zod 验证
rules: z.string().min(1).max(100)
rules: z.number().min(0).max(100)
rules: z.string().email({ message: '请输入有效的邮箱' })
```

### 4.4 表单 API

```typescript
// 获取表单值
const values = formApi.getValues();

// 设置表单值
formApi.setValues({ name: '张三', type: '1' });

// 重置表单
formApi.resetForm();

// 验证表单
const valid = await formApi.validate();

// 提交表单
formApi.submitForm();
```

## 5. 组件适配器系统

项目使用适配器模式统一组件接口，位于 `adapter/component/index.ts`。

### 5.1 适配器优势

- **统一接口**：所有组件使用相同的 API
- **易于切换**：可以轻松更换底层 UI 库
- **自定义行为**：统一处理占位符、空值等
- **按需加载**：组件异步加载，优化性能

### 5.2 自定义组件

如需添加新的自定义组件，在 `adapter/component/index.ts` 中注册：

```typescript
const components: Partial<Record<ComponentType, Component>> = {
  // 添加自定义组件
  CustomComponent: defineAsyncComponent(() =>
    import('./custom-component.vue')
  ),
};

globalShareState.setComponents(components);
```

## 6. 布局组件

项目提供两种标准布局，位于 `src/layouts/`。

### 6.1 基础布局（Basic Layout）

用于主应用页面，包含：
- 顶部导航栏
- 侧边菜单
- 内容区域
- 页脚

```vue
<template>
  <BasicLayout>
    <RouterView />
  </BasicLayout>
</template>
```

### 6.2 认证布局（Auth Layout）

用于登录、注册等认证页面：

```vue
<template>
  <AuthLayout>
    <AuthenticationLogin />
  </AuthLayout>
</template>
```

## 7. 图标系统

项目集成 Iconify 图标系统，通过 `@vben/icons` 使用。

### 7.1 使用图标

```vue
<template>
  <Icon icon="mdi:account" />
  <Icon icon="carbon:user-avatar" :size="24" />
</template>

<script setup lang="ts">
import { Icon } from '@vben/icons';
</script>
```

### 7.2 图标选择器

```typescript
{
  component: 'IconPicker',
  fieldName: 'icon',
  label: '图标',
}
```

## 8. 指令系统

### 8.1 加载指令

项目已注册 `v-loading` 和 `v-spinning` 指令：

```vue
<template>
  <div v-loading="loading">
    内容区域
  </div>
  
  <NButton v-spinning="submitting">
    提交
  </NButton>
</template>
```

### 8.2 权限指令

```vue
<template>
  <!-- 根据权限码显示/隐藏 -->
  <NButton v-access="'user:create'">
    新增用户
  </NButton>
  
  <!-- 根据角色显示/隐藏 -->
  <NButton v-access="{ role: 'admin' }">
    管理员功能
  </NButton>
</template>
```

## 9. 最佳实践

### 9.1 组件导入规范

**推荐**：使用适配器导入
```typescript
import { message, notification, dialog } from '#/adapter/naive';
import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
```

**避免**：直接从 UI 库导入全局 API
```typescript
// ❌ 不推荐
import { useMessage } from 'naive-ui';
```

### 9.2 类型定义

始终为组件添加类型定义：

```typescript
import type { DataTableColumns } from 'naive-ui';
import type { VbenFormSchema } from '#/adapter/form';
import type { FormInst, FormRules } from 'naive-ui';
```

### 9.3 表单处理

使用 VbenForm 而不是原生 Naive UI 表单：

```typescript
// ✅ 推荐
const [Form, formApi] = useVbenForm({ schema });

// ❌ 不推荐
import { NForm } from 'naive-ui';
```

### 9.4 异步组件

对于大型组件，使用异步加载：

```typescript
const HeavyComponent = defineAsyncComponent(() =>
  import('./heavy-component.vue')
);
```

### 9.5 主题适配

确保组件支持亮色/暗色主题：

```typescript
import { preferences } from '@vben/preferences';

const isDark = computed(() => preferences.theme.mode === 'dark');
```

## 10. 常见问题

### 10.1 表单空值问题

Naive UI 的空值为 `null`，不是 `undefined`。项目已在 `adapter/form.ts` 中配置：

```typescript
config: {
  emptyStateValue: null,
}
```

### 10.2 表单重置不生效

确保使用 VbenForm 的 API：

```typescript
formApi.resetForm(); // ✅ 正确
form.value.reset();  // ❌ 可能不生效
```

### 10.3 消息提示不显示

确保使用适配器导入的 API：

```typescript
import { message } from '#/adapter/naive'; // ✅ 正确
import { useMessage } from 'naive-ui';     // ❌ 可能不生效
```

## 11. 参考资源

- [Naive UI 官方文档](https://www.naiveui.com/)
- [VXE Table 官方文档](https://vxetable.cn/)
- [Vben Admin 文档](https://doc.vben.pro/)
- [Iconify 图标库](https://icon-sets.iconify.design/)

---

**注意**：本文档会随着项目发展持续更新，请定期查看最新版本。
