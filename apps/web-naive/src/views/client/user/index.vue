<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui';

import type { ClientUserApi } from '#/api';

import { computed, h, onMounted, ref } from 'vue';

import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSwitch,
} from 'naive-ui';

import { dialog, message } from '#/adapter/naive';
import {
  createClientUserApi,
  deleteClientUserApi,
  getClientUserListApi,
  resetClientUserPasswordApi,
  toggleClientUserApi,
  updateClientUserApi,
} from '#/api';
import { getClientModulesApi } from '#/api/modules/client';

defineOptions({ name: 'ClientUserPage' });

const loading = ref(false);
const dataSource = ref<ClientUserApi.ClientUser[]>([]);
const keyword = ref('');
const enabledFilter = ref(-1);
const moduleCodeFilter = ref<null | string>(null);
const moduleOptions = ref<{ label: string; value: string }[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const showModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const editingId = ref<null | number>(null);

const formData = ref<ClientUserApi.CreateParams>({
  username: '',
  password: '',
  nickName: '',
  phone: '',
  email: '',
  gender: undefined,
  moduleCode: undefined,
  enabled: true,
  remark: '',
});

const showResetPwdModal = ref(false);
const resetPwdUserId = ref<null | number>(null);
const resetPwdValue = ref('');

const genderOptions = [
  { label: '男', value: 1 },
  { label: '女', value: 0 },
];

const enabledFilterOptions = [
  { label: '全部', value: -1 },
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const columns = computed(
  (): DataTableColumns<ClientUserApi.ClientUser> => [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_r, i) => h('span', (page.value - 1) * pageSize.value + i + 1),
    },
    { title: '用户名', key: 'username', minWidth: 120 },
    { title: '昵称', key: 'nickName', minWidth: 100 },
    {
      title: '所属模块',
      key: 'moduleCode',
      width: 110,
      render: (row) => {
        const mod = moduleOptions.value.find((m) => m.value === row.moduleCode);
        return mod ? mod.label : row.moduleCode || '-';
      },
    },
    { title: '手机号', key: 'phone', width: 130 },
    { title: '邮箱', key: 'email', minWidth: 160, ellipsis: { tooltip: true } },
    {
      title: '性别',
      key: 'gender',
      width: 70,
      render: (row) => {
        if (row.gender === 1) return '男';
        if (row.gender === 0) return '女';
        return '-';
      },
    },
    {
      title: '状态',
      key: 'enabled',
      width: 80,
      render: (row) =>
        h(NSwitch, {
          value: row.enabled,
          onUpdateValue: () => handleToggle(row),
        }),
    },
    {
      title: '创建时间',
      key: 'createdAt',
      width: 160,
      render: (row) => formatTime(row.createdAt),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (row) =>
        h(
          NSpace,
          { size: 4 },
          {
            default: () => [
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'primary',
                  onClick: () => openEditModal(row),
                },
                { default: () => '编辑' },
              ),
              h(
                NButton,
                { size: 'tiny', onClick: () => openResetPwd(row) },
                { default: () => '重置密码' },
              ),
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'error',
                  onClick: () => handleDelete(row),
                },
                { default: () => '删除' },
              ),
            ],
          },
        ),
    },
  ],
);

async function fetchData() {
  loading.value = true;
  try {
    const params: ClientUserApi.QueryParams = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (keyword.value) params.keyword = keyword.value;
    if (enabledFilter.value !== -1) params.enabled = enabledFilter.value;
    if (moduleCodeFilter.value) params.moduleCode = moduleCodeFilter.value;
    const result = await getClientUserListApi(params);
    dataSource.value = result.pageData;
    total.value = result.total;
  } catch {
    // 错误已被拦截器处理
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  fetchData();
}

function openCreateModal() {
  modalMode.value = 'create';
  editingId.value = null;
  formData.value = {
    username: '',
    password: '',
    nickName: '',
    phone: '',
    email: '',
    gender: undefined,
    moduleCode: undefined,
    enabled: true,
    remark: '',
  };
  showModal.value = true;
}

function openEditModal(row: ClientUserApi.ClientUser) {
  modalMode.value = 'edit';
  editingId.value = row.id;
  formData.value = {
    username: row.username,
    password: '',
    nickName: row.nickName || '',
    phone: row.phone || '',
    email: row.email || '',
    gender: row.gender,
    moduleCode: row.moduleCode || undefined,
    enabled: row.enabled,
    remark: row.remark || '',
  };
  showModal.value = true;
}

async function handleSave() {
  if (!formData.value.username) {
    message.warning('请输入用户名');
    return;
  }
  try {
    if (modalMode.value === 'create') {
      if (!formData.value.password) {
        message.warning('请输入密码');
        return;
      }
      await createClientUserApi(formData.value);
      message.success('创建成功');
    } else if (editingId.value) {
      const updateData: ClientUserApi.UpdateParams = { ...formData.value };
      if (!updateData.password) delete updateData.password;
      await updateClientUserApi(editingId.value, updateData);
      message.success('更新成功');
    }
    showModal.value = false;
    await fetchData();
  } catch {
    // 错误已被拦截器处理
  }
}

async function handleToggle(row: ClientUserApi.ClientUser) {
  try {
    await toggleClientUserApi(row.id);
    message.success(row.enabled ? '已禁用' : '已启用');
    await fetchData();
  } catch {
    // 错误已被拦截器处理
  }
}

function handleDelete(row: ClientUserApi.ClientUser) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除用户「${row.username}」吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteClientUserApi(row.id);
        message.success('删除成功');
        await fetchData();
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
}

function openResetPwd(row: ClientUserApi.ClientUser) {
  resetPwdUserId.value = row.id;
  resetPwdValue.value = '';
  showResetPwdModal.value = true;
}

async function handleResetPwd() {
  if (!resetPwdValue.value || resetPwdValue.value.length < 6) {
    message.warning('密码至少6位');
    return;
  }
  try {
    await resetClientUserPasswordApi(
      resetPwdUserId.value!,
      resetPwdValue.value,
    );
    message.success('密码重置成功');
    showResetPwdModal.value = false;
  } catch {
    // 错误已被拦截器处理
  }
}

async function fetchModules() {
  try {
    const result = await getClientModulesApi({ pageSize: 100 });
    moduleOptions.value = (result.pageData || []).map((m) => ({
      label: m.name,
      value: m.code,
    }));
  } catch {
    // 错误已被拦截器处理
  }
}

onMounted(() => {
  fetchModules();
  fetchData();
});
</script>

<template>
  <div class="p-4">
    <NCard title="客户端用户管理" :bordered="false" size="small">
      <!-- 搜索栏 -->
      <div class="mb-3 flex items-center justify-between">
        <NSpace>
          <NInput
            v-model:value="keyword"
            placeholder="搜索用户名/昵称/手机号"
            clearable
            style="width: 220px"
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
          <NSelect
            v-model:value="moduleCodeFilter"
            :options="moduleOptions"
            placeholder="所属模块"
            clearable
            style="width: 140px"
            @update:value="handleSearch"
          />
          <NRadioGroup
            v-model:value="enabledFilter"
            size="small"
            @update:value="handleSearch"
          >
            <NRadioButton
              v-for="opt in enabledFilterOptions"
              :key="String(opt.value)"
              :value="opt.value"
              :label="opt.label"
            />
          </NRadioGroup>
          <NButton type="primary" @click="handleSearch">查询</NButton>
        </NSpace>
        <NButton type="primary" @click="openCreateModal">新增用户</NButton>
      </div>

      <!-- 表格 -->
      <NDataTable
        :columns="columns"
        :data="dataSource"
        :loading="loading"
        :row-key="(row: ClientUserApi.ClientUser) => row.id"
        :scroll-x="1200"
        striped
      />

      <!-- 分页 -->
      <div class="mt-3 flex justify-end">
        <NPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page="fetchData"
          @update:page-size="
            () => {
              page = 1;
              fetchData();
            }
          "
        />
      </div>
    </NCard>

    <!-- 新增/编辑弹窗 -->
    <NModal
      v-model:show="showModal"
      preset="dialog"
      :title="modalMode === 'create' ? '新增客户端用户' : '编辑客户端用户'"
      :positive-text="modalMode === 'create' ? '创建' : '更新'"
      negative-text="取消"
      style="width: 560px"
      @positive-click="handleSave"
    >
      <NForm :model="formData" label-placement="left" label-width="80">
        <NFormItem label="用户名" required>
          <NInput v-model:value="formData.username" placeholder="用户名" />
        </NFormItem>
        <NFormItem label="密码" :required="modalMode === 'create'">
          <NInput
            v-model:value="formData.password"
            type="password"
            show-password-on="click"
            :placeholder="
              modalMode === 'edit' ? '留空不修改' : '密码（至少6位）'
            "
          />
        </NFormItem>
        <NFormItem label="昵称">
          <NInput v-model:value="formData.nickName" placeholder="昵称" />
        </NFormItem>
        <NFormItem label="手机号">
          <NInput v-model:value="formData.phone" placeholder="手机号" />
        </NFormItem>
        <NFormItem label="邮箱">
          <NInput v-model:value="formData.email" placeholder="邮箱" />
        </NFormItem>
        <NFormItem label="所属模块">
          <NSelect
            v-model:value="formData.moduleCode"
            :options="moduleOptions"
            placeholder="请选择模块"
            clearable
          />
        </NFormItem>
        <NFormItem label="性别">
          <NSelect
            v-model:value="formData.gender"
            :options="genderOptions"
            placeholder="请选择"
            clearable
          />
        </NFormItem>
        <NFormItem label="备注">
          <NInput
            v-model:value="formData.remark"
            type="textarea"
            :rows="2"
            placeholder="备注"
          />
        </NFormItem>
        <NFormItem label="启用">
          <NSwitch v-model:value="formData.enabled" />
        </NFormItem>
      </NForm>
    </NModal>

    <!-- 重置密码弹窗 -->
    <NModal
      v-model:show="showResetPwdModal"
      preset="dialog"
      title="重置密码"
      positive-text="确定"
      negative-text="取消"
      style="width: 400px"
      @positive-click="handleResetPwd"
    >
      <NForm label-placement="left" label-width="80">
        <NFormItem label="新密码" required>
          <NInput
            v-model:value="resetPwdValue"
            type="password"
            show-password-on="click"
            placeholder="请输入新密码（至少6位）"
          />
        </NFormItem>
      </NForm>
    </NModal>
  </div>
</template>
