<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui';

import type { SmsConfigApi } from '#/api';

import { computed, h, onMounted, ref } from 'vue';

import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NSpin,
  NSwitch,
  NTag,
} from 'naive-ui';

import { dialog, message } from '#/adapter/naive';
import {
  createSmsConfigApi,
  deleteSmsConfigApi,
  getSmsConfigListApi,
  setDefaultSmsConfigApi,
  toggleSmsConfigApi,
  updateSmsConfigApi,
} from '#/api';
import { useDict } from '#/composables/use-dict';
import { DICT_CODES } from '#/utils/dict';

defineOptions({ name: 'SmsConfig' });

const { options: providerOptions } = useDict(DICT_CODES.SMS_PROVIDER);

const loading = ref(false);
const dataSource = ref<SmsConfigApi.SmsConfig[]>([]);
const keyword = ref('');
const providerFilter = ref<string>('');

const showModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const editingId = ref<null | number>(null);

const formData = ref<SmsConfigApi.CreateParams>({
  name: '',
  provider: 'aliyun',
  accessKey: '',
  secretKey: '',
  signName: '',
  templateId: '',
  isDefault: false,
  enabled: true,
  loadBalanceConfig: '',
  retryInterval: 60,
  remark: '',
});

const providerFilterOptions = computed(() => [
  { label: '全部', value: '' },
  ...providerOptions.value,
]);

function getProviderLabel(value: string) {
  return providerOptions.value.find((o) => o.value === value)?.label || value;
}

const columns = computed(
  (): DataTableColumns<SmsConfigApi.SmsConfig> => [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_row, index) => h('span', index + 1),
    },
    { title: '名称', key: 'name', minWidth: 120 },
    {
      title: '厂商',
      key: 'provider',
      width: 100,
      render: (row) =>
        h(
          NTag,
          { type: 'info', size: 'small', bordered: false },
          { default: () => getProviderLabel(row.provider) },
        ),
    },
    {
      title: '是否默认',
      key: 'isDefault',
      width: 90,
      render: (row) =>
        h(
          NTag,
          { type: row.isDefault ? 'success' : 'default', size: 'small' },
          { default: () => (row.isDefault ? '是' : '否') },
        ),
    },
    {
      title: 'Access Key',
      key: 'accessKey',
      minWidth: 140,
      ellipsis: { tooltip: true },
    },
    { title: '短信签名', key: 'signName', width: 120 },
    {
      title: '模板ID',
      key: 'templateId',
      minWidth: 120,
      ellipsis: { tooltip: true },
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
    { title: '重试间隔(秒)', key: 'retryInterval', width: 110 },
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
                { default: () => '修改' },
              ),
              h(
                NButton,
                {
                  size: 'tiny',
                  onClick: () => handleSetDefault(row),
                  disabled: row.isDefault,
                },
                { default: () => '设为默认' },
              ),
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'error',
                  onClick: () => handleDelete(row),
                  disabled: row.isDefault,
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
    const params: SmsConfigApi.QueryParams = { page: 1, pageSize: 100 };
    if (keyword.value) params.keyword = keyword.value;
    if (providerFilter.value) params.provider = providerFilter.value;
    const result = await getSmsConfigListApi(params);
    dataSource.value = result.items;
  } catch {
    // 错误已被拦截器处理
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  modalMode.value = 'create';
  editingId.value = null;
  formData.value = {
    name: '',
    provider: 'aliyun',
    accessKey: '',
    secretKey: '',
    signName: '',
    templateId: '',
    isDefault: false,
    enabled: true,
    loadBalanceConfig: '',
    retryInterval: 60,
    remark: '',
  };
  showModal.value = true;
}

function openEditModal(row: SmsConfigApi.SmsConfig) {
  modalMode.value = 'edit';
  editingId.value = row.id;
  formData.value = {
    name: row.name,
    provider: row.provider,
    accessKey: row.accessKey,
    secretKey: '',
    signName: row.signName,
    templateId: row.templateId,
    isDefault: row.isDefault,
    enabled: row.enabled,
    loadBalanceConfig: row.loadBalanceConfig || '',
    retryInterval: row.retryInterval,
    remark: row.remark || '',
  };
  showModal.value = true;
}

async function handleSave() {
  if (!formData.value.name) {
    message.warning('请输入配置名称');
    return;
  }
  if (!formData.value.accessKey) {
    message.warning('请输入 Access Key');
    return;
  }
  if (!formData.value.signName) {
    message.warning('请输入短信签名');
    return;
  }
  if (!formData.value.templateId) {
    message.warning('请输入模板ID');
    return;
  }

  try {
    if (modalMode.value === 'create') {
      if (!formData.value.secretKey) {
        message.warning('请输入 Secret Key');
        return;
      }
      await createSmsConfigApi(formData.value);
      message.success('创建成功');
    } else if (editingId.value) {
      const updateData: SmsConfigApi.UpdateParams = { ...formData.value };
      if (!updateData.secretKey) {
        delete updateData.secretKey;
      }
      await updateSmsConfigApi(editingId.value, updateData);
      message.success('更新成功');
    }
    showModal.value = false;
    await fetchData();
  } catch {
    // 错误已被拦截器处理
  }
}

async function handleToggle(row: SmsConfigApi.SmsConfig) {
  try {
    await toggleSmsConfigApi(row.id);
    message.success(row.enabled ? '已禁用' : '已启用');
    await fetchData();
  } catch {
    // 错误已被拦截器处理
  }
}

function handleSetDefault(row: SmsConfigApi.SmsConfig) {
  if (row.isDefault) return;
  dialog.info({
    title: '设为默认',
    content: `确定将「${row.name}」设为默认短信配置吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await setDefaultSmsConfigApi(row.id);
        message.success('已设为默认');
        await fetchData();
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
}

function handleDelete(row: SmsConfigApi.SmsConfig) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除短信配置「${row.name}」吗？此操作不可恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteSmsConfigApi(row.id);
        message.success('删除成功');
        await fetchData();
      } catch {
        // 错误已被拦截器处理
      }
    },
  });
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div>
    <!-- 搜索栏 -->
    <div class="mb-4 flex items-center justify-between">
      <NSpace>
        <NInput
          v-model:value="keyword"
          placeholder="搜索名称"
          clearable
          style="width: 200px"
          @clear="fetchData"
          @keyup.enter="fetchData"
        />
        <NSelect
          v-model:value="providerFilter"
          :options="providerFilterOptions"
          placeholder="厂商"
          clearable
          style="width: 140px"
          @update:value="fetchData"
        />
        <NButton type="primary" @click="fetchData">查询</NButton>
      </NSpace>
      <NButton type="primary" @click="openCreateModal">新增</NButton>
    </div>

    <!-- 表格 -->
    <NSpin :show="loading">
      <NDataTable
        :columns="columns"
        :data="dataSource"
        :row-key="(row: SmsConfigApi.SmsConfig) => row.id"
        :scroll-x="1300"
        striped
      />
    </NSpin>

    <!-- 新增/编辑弹窗 -->
    <NModal
      v-model:show="showModal"
      preset="dialog"
      :title="modalMode === 'create' ? '新增短信配置' : '编辑短信配置'"
      :positive-text="modalMode === 'create' ? '创建' : '更新'"
      negative-text="取消"
      style="width: 600px"
      @positive-click="handleSave"
    >
      <NForm :model="formData" label-placement="left" label-width="120">
        <NFormItem label="配置名称" required>
          <NInput
            v-model:value="formData.name"
            placeholder="例如：阿里云短信"
          />
        </NFormItem>
        <NFormItem label="厂商" required>
          <NSelect
            v-model:value="formData.provider"
            :options="providerOptions"
          />
        </NFormItem>
        <NFormItem label="Access Key" required>
          <NInput v-model:value="formData.accessKey" placeholder="Access Key" />
        </NFormItem>
        <NFormItem label="Secret Key" :required="modalMode === 'create'">
          <NInput
            v-model:value="formData.secretKey"
            type="password"
            show-password-on="click"
            :placeholder="
              modalMode === 'edit' ? '留空表示不修改' : 'Secret Key'
            "
          />
        </NFormItem>
        <NFormItem label="短信签名" required>
          <NInput v-model:value="formData.signName" placeholder="短信签名" />
        </NFormItem>
        <NFormItem label="模板ID" required>
          <NInput v-model:value="formData.templateId" placeholder="模板ID" />
        </NFormItem>
        <NFormItem label="重试间隔(秒)">
          <NInputNumber
            v-model:value="formData.retryInterval"
            :min="0"
            style="width: 100%"
          />
        </NFormItem>
        <NFormItem label="负载均衡配置">
          <NInput
            v-model:value="formData.loadBalanceConfig"
            type="textarea"
            :rows="2"
            placeholder="JSON 格式（可选）"
          />
        </NFormItem>
        <NFormItem label="备注">
          <NInput
            v-model:value="formData.remark"
            type="textarea"
            :rows="2"
            placeholder="备注信息"
          />
        </NFormItem>
        <NFormItem label="启用状态">
          <NSwitch v-model:value="formData.enabled" />
        </NFormItem>
        <NFormItem label="设为默认">
          <NSwitch v-model:value="formData.isDefault" />
        </NFormItem>
      </NForm>
    </NModal>
  </div>
</template>
