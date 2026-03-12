---
inclusion: always
---

# 前端代码规范（Vue 3 + TypeScript）

本文档定义 Vue 3 + TypeScript 前端代码的编写规范，确保代码质量、可维护性和一致性。

## 1. 项目架构规范

### 1.1 页面组件结构

每个页面应遵循以下组件化结构：

```
views/
└── feature/
    ├── index.vue              # 主页面（容器组件）
    ├── components/            # 页面专属组件
    │   ├── FeatureTable.vue  # 表格组件
    │   ├── FeatureModal.vue  # 弹窗组件
    │   └── FeatureDrawer.vue # 抽屉组件
    └── types.ts              # 类型定义（可选）
```

### 1.2 组件分层职责

**容器组件（index.vue）**：
- ✅ 管理页面状态
- ✅ 处理数据获取和更新
- ✅ 协调子组件交互
- ✅ 处理路由和权限
- ❌ 不包含复杂的 UI 逻辑
- ❌ 不直接操作 DOM

**展示组件（Table/Modal/Drawer）**：
- ✅ 接收 props 数据
- ✅ 触发 emit 事件
- ✅ 专注于 UI 展示
- ✅ 可复用性强
- ❌ 不直接调用 API
- ❌ 不管理全局状态

**工具组件（utils/）**：
- ✅ 纯函数组件
- ✅ 无副作用
- ✅ 高度可复用


## 2. 页面组件化规范

### 2.1 容器组件（主页面）

```vue
<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { message } from '#/adapter/naive';
import { getUserListApi, deleteUserApi } from '#/api';
import UserTable from './components/UserTable.vue';
import UserModal from './components/UserModal.vue';

defineOptions({ name: 'UserManagePage' });

// 状态管理
const loading = ref(false);
const dataSource = ref<User[]>([]);
const modalOpen = ref(false);

// 数据获取
async function fetchData() {
  loading.value = true;
  try {
    const result = await getUserListApi();
    dataSource.value = result.items;
  } finally {
    loading.value = false;
  }
}

// 操作处理
function handleCreate() {
  modalOpen.value = true;
}

function handleDelete(id: number) {
  // 删除逻辑
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="p-4">
    <NCard title="用户管理" :bordered="false">
      <UserTable
        :data="dataSource"
        :loading="loading"
        @create="handleCreate"
        @delete="handleDelete"
      />
      
      <UserModal
        v-model:show="modalOpen"
        @submit="fetchData"
      />
    </NCard>
  </div>
</template>
```

### 2.2 表格组件

```vue
<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui';
import { computed, h } from 'vue';
import { NButton, NDataTable, NSpace, NTag } from 'naive-ui';

interface Props {
  data: User[];
  loading?: boolean;
}

interface Emits {
  (e: 'create'): void;
  (e: 'edit', id: number): void;
  (e: 'delete', id: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

const columns = computed((): DataTableColumns<User> => [
  { title: 'ID', key: 'id', width: 80 },
  { title: '用户名', key: 'username', minWidth: 160 },
  {
    title: '状态',
    key: 'enabled',
    width: 90,
    render: (row) =>
      h(NTag, { type: row.enabled ? 'success' : 'default' }, 
        { default: () => row.enabled ? '启用' : '停用' }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { 
            size: 'tiny', 
            type: 'primary',
            onClick: () => emit('edit', row.id) 
          }, { default: () => '编辑' }),
          h(NButton, { 
            size: 'tiny', 
            type: 'error',
            onClick: () => emit('delete', row.id) 
          }, { default: () => '删除' }),
        ],
      }),
  },
]);
</script>

<template>
  <div>
    <div class="mb-3 flex justify-between">
      <NSpace>
        <NButton type="primary" @click="emit('create')">
          新增用户
        </NButton>
      </NSpace>
    </div>
    
    <NDataTable
      :columns="columns"
      :data="data"
      :loading="loading"
      :row-key="(row) => row.id"
      striped
    />
  </div>
</template>
```


### 2.3 弹窗组件

```vue
<script lang="ts" setup>
import { ref, watch } from 'vue';
import { NModal, NForm, NFormItem, NInput, NButton, NSpace } from 'naive-ui';
import { useVbenForm, z } from '#/adapter/form';
import { message } from '#/adapter/naive';
import { createUserApi } from '#/api';

interface Props {
  show: boolean;
  mode?: 'create' | 'edit';
  initialValues?: Partial<User>;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'submit'): void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
});

const emit = defineEmits<Emits>();

const [Form, formApi] = useVbenForm({
  schema: [
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
  ],
});

// 监听 show 变化，重置表单
watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.initialValues) {
      formApi.setValues(props.initialValues);
    } else {
      formApi.resetForm();
    }
  }
});

async function handleSubmit() {
  const valid = await formApi.validate();
  if (!valid) return;

  try {
    const values = formApi.getValues();
    await createUserApi(values);
    message.success('操作成功');
    emit('update:show', false);
    emit('submit');
  } catch (error) {
    // 错误已被拦截器处理
  }
}

function handleClose() {
  emit('update:show', false);
}
</script>

<template>
  <NModal
    :show="show"
    preset="dialog"
    :title="mode === 'create' ? '新增用户' : '编辑用户'"
    :positive-text="mode === 'create' ? '创建' : '更新'"
    negative-text="取消"
    @positive-click="handleSubmit"
    @negative-click="handleClose"
    @close="handleClose"
  >
    <Form />
  </NModal>
</template>
```

### 2.4 抽屉组件

```vue
<script lang="ts" setup>
import { ref } from 'vue';
import { NDrawer, NDrawerContent, NButton, NSpace } from 'naive-ui';

interface Props {
  show: boolean;
  title?: string;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'submit'): void;
}

const props = withDefaults(defineProps<Props>(), {
  title: '详情',
});

const emit = defineEmits<Emits>();

function handleSubmit() {
  emit('submit');
  emit('update:show', false);
}
</script>

<template>
  <NDrawer
    :show="show"
    :width="600"
    placement="right"
    @update:show="emit('update:show', $event)"
  >
    <NDrawerContent :title="title" closable>
      <slot />
      
      <template #footer>
        <NSpace justify="end">
          <NButton @click="emit('update:show', false)">
            取消
          </NButton>
          <NButton type="primary" @click="handleSubmit">
            确定
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
```


## 3. 组件通信规范

### 3.1 Props 传递

```typescript
// ✅ 好 - 使用 TypeScript 接口定义 Props
interface Props {
  data: User[];
  loading?: boolean;
  pageSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  pageSize: 10,
});

// ❌ 不好 - 使用运行时声明
const props = defineProps({
  data: Array,
  loading: Boolean,
});
```

### 3.2 Emits 事件

```typescript
// ✅ 好 - 使用 TypeScript 定义 Emits
interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'submit', data: User): void;
  (e: 'delete', id: number): void;
}

const emit = defineEmits<Emits>();

// 触发事件
emit('submit', userData);
emit('delete', userId);

// ❌ 不好 - 不定义类型
const emit = defineEmits(['submit', 'delete']);
```

### 3.3 v-model 双向绑定

```typescript
// ✅ 好 - 使用 v-model
interface Props {
  show: boolean;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 在模板中
<NModal
  :show="show"
  @update:show="emit('update:show', $event)"
/>

// ❌ 不好 - 手动管理状态
const visible = ref(false);
watch(() => props.show, (val) => {
  visible.value = val;
});
```

### 3.4 Provide/Inject

```typescript
// ✅ 好 - 用于跨层级通信
// 父组件
import { provide } from 'vue';

const refreshData = () => {
  fetchData();
};

provide('refreshData', refreshData);

// 子组件
import { inject } from 'vue';

const refreshData = inject<() => void>('refreshData');

// ❌ 不好 - 滥用 provide/inject
// 简单的父子通信应该使用 props/emits
```


## 4. 状态管理规范

### 4.1 组件内状态

```typescript
// ✅ 好 - 基本类型使用 ref
const count = ref(0);
const name = ref('');
const isVisible = ref(false);
const userList = ref<User[]>([]);

// ✅ 好 - 对象使用 reactive
const formData = reactive({
  name: '',
  age: 0,
  email: '',
});

// ✅ 好 - 复杂对象使用 ref
const user = ref<User | null>(null);

// ❌ 不好 - 基本类型使用 reactive
const state = reactive({
  count: 0,
  name: '',
});
```

### 4.2 计算属性

```typescript
// ✅ 好 - 使用计算属性
const filteredList = computed(() => {
  return userList.value.filter(user => user.enabled);
});

const fullName = computed(() => {
  return `${firstName.value} ${lastName.value}`;
});

// ❌ 不好 - 在模板中计算
<div v-for="user in userList.filter(u => u.enabled)" :key="user.id">
```

### 4.3 监听器

```typescript
// ✅ 好 - 监听单个值
watch(() => props.userId, (newId) => {
  fetchUserData(newId);
});

// ✅ 好 - 监听多个值
watch([() => props.page, () => props.pageSize], () => {
  fetchData();
});

// ✅ 好 - 立即执行
watch(() => props.keyword, (keyword) => {
  searchData(keyword);
}, { immediate: true });

// ❌ 不好 - 过度使用 watch
watch(() => props.data, (data) => {
  // 应该使用计算属性
  processedData.value = data.map(item => ({ ...item, processed: true }));
});
```

### 4.4 全局状态（Pinia）

```typescript
// ✅ 好 - 使用 Pinia Store
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null);
  const isLoggedIn = computed(() => !!user.value);

  async function login(credentials: LoginDto) {
    const result = await loginApi(credentials);
    user.value = result.user;
  }

  function logout() {
    user.value = null;
  }

  return { user, isLoggedIn, login, logout };
});

// 在组件中使用
const userStore = useUserStore();
const { user, isLoggedIn } = storeToRefs(userStore);
```


## 5. API 调用规范

### 5.1 数据获取

```typescript
// ✅ 好 - 标准数据获取模式
const loading = ref(false);
const dataSource = ref<User[]>([]);

async function fetchData() {
  loading.value = true;
  try {
    const result = await getUserListApi({
      page: page.value,
      pageSize: pageSize.value,
    });
    dataSource.value = result.items;
  } catch (error) {
    // 错误已被拦截器处理
    console.error('Failed to fetch data:', error);
  } finally {
    loading.value = false;
  }
}

// ❌ 不好 - 缺少 finally
async function fetchData() {
  loading.value = true;
  try {
    const result = await getUserListApi();
    dataSource.value = result.items;
    loading.value = false;
  } catch (error) {
    loading.value = false;
  }
}
```

### 5.2 数据提交

```typescript
// ✅ 好 - 表单提交
async function handleSubmit(values: CreateUserDto) {
  try {
    if (isEdit.value) {
      await updateUserApi(editId.value, values);
      message.success('更新成功');
    } else {
      await createUserApi(values);
      message.success('创建成功');
    }
    
    emit('submit');
    emit('update:show', false);
  } catch (error) {
    // 错误已被拦截器处理
  }
}
```

### 5.3 删除确认

```typescript
import { dialog } from '#/adapter/naive';

// ✅ 好 - 使用确认对话框
function handleDelete(id: number, name: string) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除「${name}」吗？此操作不可恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteUserApi(id);
        message.success('删除成功');
        await fetchData();
      } catch (error) {
        // 错误已被拦截器处理
      }
    },
  });
}
```

### 5.4 批量操作

```typescript
// ✅ 好 - 批量删除
async function handleBatchDelete() {
  if (checkedRowKeys.value.length === 0) {
    message.warning('请选择要删除的数据');
    return;
  }

  dialog.warning({
    title: '批量删除',
    content: `确定删除选中的 ${checkedRowKeys.value.length} 条记录吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        for (const id of checkedRowKeys.value) {
          await deleteUserApi(id);
        }
        message.success('删除成功');
        await fetchData();
        checkedRowKeys.value = [];
      } catch (error) {
        // 错误已被拦截器处理
      }
    },
  });
}
```


## 6. 表单处理规范

### 6.1 使用 VbenForm

```typescript
import { useVbenForm, z } from '#/adapter/form';

// ✅ 好 - 使用 VbenForm
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
  ],
});

// 获取表单值
const values = formApi.getValues();

// 设置表单值
formApi.setValues({ name: '张三', type: '1' });

// 重置表单
formApi.resetForm();

// 验证表单
const valid = await formApi.validate();
```

### 6.2 表单验证规则

```typescript
// ✅ 好 - 使用 Zod 验证
rules: z.string().min(1, { message: '请输入' })
rules: z.string().email({ message: '请输入有效的邮箱' })
rules: z.number().min(0).max(100)
rules: z.string().refine((val) => val.length >= 6, {
  message: '密码至少6位',
})

// ✅ 好 - 使用预定义规则
rules: 'required'
rules: 'selectRequired'
```

### 6.3 动态表单

```typescript
// ✅ 好 - 根据条件显示字段
const schema = computed(() => [
  {
    component: 'Select',
    fieldName: 'type',
    label: '类型',
    rules: 'selectRequired',
  },
  // 根据类型显示不同字段
  ...(formType.value === 'user' ? [{
    component: 'Input',
    fieldName: 'username',
    label: '用户名',
    rules: z.string().min(1),
  }] : []),
]);
```

## 7. 表格处理规范

### 7.1 使用 VXE Table

```typescript
import { useVbenVxeGrid } from '#/adapter/vxe-table';

// ✅ 好 - 使用 VbenVxeGrid
const [Grid, gridApi] = useVbenVxeGrid({
  columns: [
    { field: 'name', title: '名称', minWidth: 120 },
    { field: 'status', title: '状态', width: 100 },
    { 
      field: 'actions', 
      title: '操作', 
      width: 150,
      slots: { default: 'action' },
    },
  ],
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        const res = await fetchData({
          pageNo: page.currentPage,
          pageSize: page.pageSize,
        });
        return {
          result: res.pageData,
          page: { total: res.total },
        };
      },
    },
  },
});
```

### 7.2 表格列定义

```typescript
// ✅ 好 - 使用 computed 定义列
const columns = computed((): DataTableColumns<User> => [
  { title: 'ID', key: 'id', width: 80 },
  { title: '用户名', key: 'username', minWidth: 160 },
  {
    title: '状态',
    key: 'enabled',
    width: 90,
    render: (row) =>
      h(NTag, { type: row.enabled ? 'success' : 'default' }, 
        { default: () => row.enabled ? '启用' : '停用' }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { 
            size: 'tiny', 
            onClick: () => handleEdit(row.id) 
          }, { default: () => '编辑' }),
        ],
      }),
  },
]);
```

### 7.3 列宽建议

```typescript
// ✅ 好 - 合理的列宽设置
{ key: 'id', width: 80 }              // ID 列
{ key: 'status', width: 90 }          // 状态列
{ key: 'date', width: 180 }           // 日期列
{ key: 'actions', width: 140 }        // 操作列
{ key: 'name', minWidth: 160 }        // 其他列使用 minWidth
```


## 8. 命名规范

### 8.1 文件命名

```
✅ 好
index.vue
UserTable.vue
UserModal.vue
user-list.vue
use-user.ts

❌ 不好
Index.vue
userTable.vue
user_modal.vue
```

### 8.2 组件命名

```typescript
// ✅ 好 - PascalCase
defineOptions({ name: 'UserManagePage' });
defineOptions({ name: 'UserTable' });
defineOptions({ name: 'UserModal' });

// ❌ 不好
defineOptions({ name: 'userManagePage' });
defineOptions({ name: 'user-table' });
```

### 8.3 变量命名

```typescript
// ✅ 好 - camelCase，语义明确
const userList = ref<User[]>([]);
const isLoading = ref(false);
const hasPermission = ref(false);
const pageSize = ref(10);
const modalOpen = ref(false);

// ❌ 不好
const list = ref([]);
const loading = ref(false);
const flag = ref(false);
const size = ref(10);
```

### 8.4 函数命名

```typescript
// ✅ 好 - 动词开头
function fetchUserList() {}
function handleSubmit() {}
function handleDelete() {}
function openModal() {}
function closeDrawer() {}

// ❌ 不好
function userList() {}
function submit() {}
function modal() {}
```

### 8.5 事件命名

```typescript
// ✅ 好 - 使用动词
interface Emits {
  (e: 'submit', data: User): void;
  (e: 'delete', id: number): void;
  (e: 'update:show', value: boolean): void;
}

// ❌ 不好
interface Emits {
  (e: 'data', data: User): void;
  (e: 'remove', id: number): void;
}
```

## 9. 类型定义规范

### 9.1 接口定义

```typescript
// ✅ 好 - 使用 interface
interface User {
  id: number;
  username: string;
  email: string;
  enabled: boolean;
  roles: Role[];
}

interface CreateUserDto {
  username: string;
  password: string;
  email: string;
  roleIds: number[];
}

// ✅ 好 - 使用 type 定义联合类型
type MenuType = 'MODULE' | 'CATALOG' | 'MENU' | 'BUTTON';
type ModalMode = 'create' | 'edit';
```

### 9.2 Props 类型

```typescript
// ✅ 好 - 明确的 Props 类型
interface Props {
  data: User[];
  loading?: boolean;
  pageSize?: number;
  mode?: 'create' | 'edit';
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  pageSize: 10,
  mode: 'create',
});

// ❌ 不好 - 使用 any
interface Props {
  data: any[];
  loading: any;
}
```

### 9.3 避免使用 any

```typescript
// ✅ 好 - 使用明确类型
const user = ref<User | null>(null);
const dataSource = ref<User[]>([]);

function handleSubmit(values: CreateUserDto) {}

// ❌ 不好 - 使用 any
const user = ref<any>(null);
const dataSource = ref<any[]>([]);

function handleSubmit(values: any) {}
```

### 9.4 类型守卫

```typescript
// ✅ 好 - 使用类型守卫
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'username' in obj
  );
}

if (isUser(data)) {
  console.log(data.username);
}
```


## 10. 代码组织规范

### 10.1 组件结构顺序

```vue
<script lang="ts" setup>
// 1. 导入
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message } from '#/adapter/naive';
import { getUserListApi } from '#/api';

// 2. 类型定义
interface User {
  id: number;
  name: string;
}

interface Props {
  data: User[];
}

// 3. defineOptions
defineOptions({ name: 'UserManagePage' });

// 4. Props 和 Emits
const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 5. 响应式数据
const userList = ref<User[]>([]);
const loading = ref(false);

// 6. 计算属性
const filteredList = computed(() => {
  return userList.value.filter(u => u.enabled);
});

// 7. 方法
function fetchData() {}
function handleSubmit() {}

// 8. 生命周期
onMounted(() => {
  fetchData();
});

// 9. defineExpose（如果需要）
defineExpose({ fetchData });
</script>

<template>
  <!-- 模板内容 -->
</template>

<style scoped>
/* 样式 */
</style>
```

### 10.2 导入顺序

```typescript
// 1. Vue 核心
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// 2. 第三方库
import { NButton, NCard, NDataTable } from 'naive-ui';

// 3. 项目内部模块（使用别名）
import { message, dialog } from '#/adapter/naive';
import { useVbenForm } from '#/adapter/form';
import { getUserListApi } from '#/api';

// 4. 相对路径导入
import UserModal from './components/UserModal.vue';
import type { User } from './types';
```

### 10.3 模板组织

```vue
<template>
  <!-- 1. 容器 -->
  <div class="p-4">
    <!-- 2. 卡片/布局 -->
    <NCard title="用户管理" :bordered="false">
      <!-- 3. 搜索栏 -->
      <div class="mb-3 flex justify-between">
        <NSpace>
          <NInput v-model:value="keyword" placeholder="搜索" />
          <NButton type="primary" @click="handleSearch">查询</NButton>
        </NSpace>
        
        <NSpace>
          <NButton type="primary" @click="handleCreate">新增</NButton>
        </NSpace>
      </div>
      
      <!-- 4. 表格 -->
      <NDataTable
        :columns="columns"
        :data="dataSource"
        :loading="loading"
      />
      
      <!-- 5. 分页 -->
      <div class="mt-3 flex justify-end">
        <NPagination
          v-model:page="page"
          :item-count="total"
        />
      </div>
    </NCard>
    
    <!-- 6. 弹窗/抽屉 -->
    <UserModal
      v-model:show="modalOpen"
      @submit="fetchData"
    />
  </div>
</template>
```

## 11. 性能优化规范

### 11.1 计算属性缓存

```typescript
// ✅ 好 - 使用计算属性
const filteredList = computed(() => {
  return userList.value.filter(user => user.enabled);
});

// ❌ 不好 - 在模板中过滤
<div v-for="user in userList.filter(u => u.enabled)" :key="user.id">
```

### 11.2 防抖和节流

```typescript
import { useDebounceFn, useThrottleFn } from '@vueuse/core';

// ✅ 好 - 搜索使用防抖
const handleSearch = useDebounceFn((keyword: string) => {
  fetchData({ keyword });
}, 300);

// ✅ 好 - 滚动使用节流
const handleScroll = useThrottleFn(() => {
  // 处理滚动
}, 100);
```

### 11.3 组件懒加载

```typescript
// ✅ 好 - 异步组件
const HeavyComponent = defineAsyncComponent(() =>
  import('./components/HeavyComponent.vue')
);

// ✅ 好 - 路由懒加载
const routes = [
  {
    path: '/user',
    component: () => import('./views/user/index.vue'),
  },
];
```

### 11.4 列表渲染优化

```vue
<!-- ✅ 好 - 使用 key -->
<div v-for="user in userList" :key="user.id">
  {{ user.name }}
</div>

<!-- ❌ 不好 - 使用 index 作为 key -->
<div v-for="(user, index) in userList" :key="index">
  {{ user.name }}
</div>

<!-- ✅ 好 - 虚拟滚动（大列表）-->
<VirtualList
  :data="largeList"
  :item-height="50"
  :height="600"
/>
```


## 12. 样式规范

### 12.1 使用 Tailwind CSS

```vue
<template>
  <!-- ✅ 好 - 使用 Tailwind 工具类 -->
  <div class="p-4 flex items-center justify-between gap-4">
    <div class="text-lg font-semibold">标题</div>
    <NButton class="ml-auto">操作</NButton>
  </div>
  
  <!-- ❌ 不好 - 内联样式 -->
  <div style="padding: 16px; display: flex;">
    <div style="font-size: 18px; font-weight: 600;">标题</div>
  </div>
</template>
```

### 12.2 Scoped 样式

```vue
<style scoped>
/* ✅ 好 - 使用 scoped 避免样式污染 */
.user-card {
  padding: 16px;
  border-radius: 8px;
}

.user-card__title {
  font-size: 18px;
  font-weight: 600;
}

/* ❌ 不好 - 全局样式 */
.card {
  padding: 16px;
}
</style>
```

### 12.3 深度选择器

```vue
<style scoped>
/* ✅ 好 - 修改子组件样式 */
:deep(.n-button) {
  border-radius: 4px;
}

/* ❌ 不好 - 使用 /deep/ 或 >>> */
/deep/ .n-button {
  border-radius: 4px;
}
</style>
```

### 12.4 响应式设计

```vue
<template>
  <!-- ✅ 好 - 使用响应式类 -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div class="col-span-1">内容</div>
  </div>
</template>

<style scoped>
/* ✅ 好 - 使用媒体查询 */
.container {
  width: 100%;
}

@media (min-width: 768px) {
  .container {
    max-width: 720px;
  }
}
</style>
```

## 13. 错误处理规范

### 13.1 API 错误处理

```typescript
// ✅ 好 - 统一错误处理
async function fetchData() {
  loading.value = true;
  try {
    const result = await getUserListApi();
    dataSource.value = result.items;
  } catch (error) {
    // 错误已被拦截器处理，这里可以做额外处理
    console.error('Failed to fetch data:', error);
  } finally {
    loading.value = false;
  }
}

// ❌ 不好 - 不处理错误
async function fetchData() {
  const result = await getUserListApi();
  dataSource.value = result.items;
}
```

### 13.2 表单验证错误

```typescript
// ✅ 好 - 验证失败提示
async function handleSubmit() {
  const valid = await formApi.validate();
  if (!valid) {
    message.warning('请检查表单填写');
    return;
  }
  
  // 提交逻辑
}
```

### 13.3 边界情况处理

```typescript
// ✅ 好 - 处理空数据
const isEmpty = computed(() => {
  return dataSource.value.length === 0;
});

// 在模板中
<template>
  <div v-if="isEmpty" class="text-center text-muted-foreground py-8">
    暂无数据
  </div>
  <NDataTable v-else :data="dataSource" />
</template>
```

## 14. 注释规范

### 14.1 组件注释

```typescript
/**
 * 用户管理页面
 * 提供用户的增删改查功能
 */
defineOptions({ name: 'UserManagePage' });
```

### 14.2 函数注释

**简单函数 - 不需要注释**：
```typescript
// ✅ 好 - 函数名已经说明了作用
function fetchUserList() {
  // 实现
}

function handleDelete(id: number) {
  // 实现
}
```

**复杂函数 - 需要注释**：
```typescript
// ✅ 好
/**
 * 递归构建树形结构
 * @param data 扁平数据
 * @param parentId 父节点ID
 * @returns 树形结构数据
 */
function buildTree(data: any[], parentId: number | null = null) {
  // 实现逻辑
}
```

### 14.3 注释原则

**必须遵循：**
- ✅ 代码应该自解释，优先使用清晰的命名
- ✅ 只为复杂逻辑添加注释
- ✅ 注释说明"为什么"而不是"做什么"
- ✅ 保持注释与代码同步

**禁止：**
- ❌ 不要为显而易见的代码添加注释
- ❌ 不要保留注释掉的代码
- ❌ 不要写过时的注释


## 15. 组件复用规范

### 15.1 提取公共组件

```typescript
// ✅ 好 - 提取可复用的表格操作列
// components/TableActions.vue
<script lang="ts" setup>
interface Props {
  row: any;
  showEdit?: boolean;
  showDelete?: boolean;
}

interface Emits {
  (e: 'edit', row: any): void;
  (e: 'delete', row: any): void;
}

const props = withDefaults(defineProps<Props>(), {
  showEdit: true,
  showDelete: true,
});

const emit = defineEmits<Emits>();
</script>

<template>
  <NSpace :size="8">
    <NButton
      v-if="showEdit"
      size="tiny"
      type="primary"
      @click="emit('edit', row)"
    >
      编辑
    </NButton>
    <NButton
      v-if="showDelete"
      size="tiny"
      type="error"
      @click="emit('delete', row)"
    >
      删除
    </NButton>
  </NSpace>
</template>

// 使用
<TableActions
  :row="row"
  @edit="handleEdit"
  @delete="handleDelete"
/>
```

### 15.2 使用 Composables

```typescript
// ✅ 好 - 提取可复用的逻辑
// composables/use-table.ts
export function useTable<T>(fetchFn: (params: any) => Promise<any>) {
  const loading = ref(false);
  const dataSource = ref<T[]>([]);
  const page = ref(1);
  const pageSize = ref(10);
  const total = ref(0);

  async function fetchData() {
    loading.value = true;
    try {
      const result = await fetchFn({
        page: page.value,
        pageSize: pageSize.value,
      });
      dataSource.value = result.items;
      total.value = result.total;
    } finally {
      loading.value = false;
    }
  }

  function handlePageChange(newPage: number) {
    page.value = newPage;
    fetchData();
  }

  return {
    loading,
    dataSource,
    page,
    pageSize,
    total,
    fetchData,
    handlePageChange,
  };
}

// 使用
const { loading, dataSource, fetchData } = useTable<User>(getUserListApi);
```

### 15.3 插槽使用

```vue
<!-- ✅ 好 - 使用插槽提供灵活性 -->
<script lang="ts" setup>
interface Props {
  title: string;
  loading?: boolean;
}

const props = defineProps<Props>();
</script>

<template>
  <NCard :title="title" :bordered="false">
    <!-- 默认插槽 -->
    <slot />
    
    <!-- 具名插槽 -->
    <template #footer>
      <slot name="footer">
        <div class="text-center text-muted-foreground">
          默认底部内容
        </div>
      </slot>
    </template>
  </NCard>
</template>

<!-- 使用 -->
<CustomCard title="用户列表">
  <UserTable :data="users" />
  
  <template #footer>
    <NPagination v-model:page="page" />
  </template>
</CustomCard>
```

## 16. 最佳实践总结

### 16.1 DO（应该做的）

**组件设计**：
- ✅ 组件职责单一
- ✅ Props 向下传递，Events 向上传递
- ✅ 使用 TypeScript 类型定义
- ✅ 提取可复用的逻辑到 Composables
- ✅ 使用插槽提供灵活性

**代码质量**：
- ✅ 使用 ESLint 和 Prettier
- ✅ 使用明确的类型定义
- ✅ 编写清晰的命名
- ✅ 适当添加注释
- ✅ 代码审查

**性能优化**：
- ✅ 使用计算属性缓存
- ✅ 使用防抖和节流
- ✅ 组件懒加载
- ✅ 列表使用 key
- ✅ 避免不必要的重渲染

**用户体验**：
- ✅ 加载状态提示
- ✅ 错误提示
- ✅ 操作确认
- ✅ 空状态处理
- ✅ 响应式设计

### 16.2 DON'T（不应该做的）

**代码质量**：
- ❌ 使用 `any` 类型
- ❌ 使用 `console.log`（生产环境）
- ❌ 在模板中写复杂逻辑
- ❌ 过长的组件（超过 300 行）
- ❌ 过深的组件嵌套（超过 3 层）

**组件设计**：
- ❌ 在展示组件中调用 API
- ❌ 在子组件中修改 Props
- ❌ 滥用全局状态
- ❌ 过度使用 provide/inject
- ❌ 组件职责不清

**性能**：
- ❌ 在模板中使用方法调用
- ❌ 使用 index 作为 key
- ❌ 不必要的 watch
- ❌ 大量数据不分页
- ❌ 不使用虚拟滚动（大列表）

**用户体验**：
- ❌ 没有加载状态
- ❌ 没有错误提示
- ❌ 没有操作确认（删除等）
- ❌ 没有空状态处理
- ❌ 不考虑移动端适配

## 17. 参考资源

- [Vue 3 官方文档](https://cn.vuejs.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Naive UI 官方文档](https://www.naiveui.com/)
- [VXE Table 官方文档](https://vxetable.cn/)
- [Vben Admin 文档](https://doc.vben.pro/)
- [VueUse 文档](https://vueuse.org/)
- [Tailwind CSS 文档](https://tailwindcss.com/)

---

**注意**: 本文档会随着项目发展持续更新，请定期查看最新版本。
