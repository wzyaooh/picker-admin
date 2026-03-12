<script lang="ts" setup>
import type { AuditApi } from '#/api/modules/audit';

import { computed } from 'vue';
import { NDescriptions, NDescriptionsItem, NDrawer, NDrawerContent, NTag, NCode } from 'naive-ui';

interface Props {
  show: boolean;
  log: AuditApi.AuditLog | null;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN');
};

const formatJson = (jsonStr: string | null | undefined) => {
  if (!jsonStr) return '';
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2);
  } catch {
    return jsonStr;
  }
};

const methodColor = computed((): 'info' | 'success' | 'warning' | 'error' | 'default' => {
  if (!props.log) return 'default';
  const colorMap: Record<string, 'info' | 'success' | 'warning' | 'error' | 'default'> = {
    GET: 'info',
    POST: 'success',
    PATCH: 'warning',
    PUT: 'warning',
    DELETE: 'error',
  };
  return colorMap[props.log.method] || 'default';
});
</script>

<template>
  <NDrawer
    :show="show"
    :width="800"
    placement="right"
    @update:show="emit('update:show', $event)"
  >
    <NDrawerContent v-if="log" title="审计日志详情" closable>
      <NDescriptions :column="2" bordered>
        <NDescriptionsItem label="日志ID">
          {{ log.id }}
        </NDescriptionsItem>
        <NDescriptionsItem label="请求ID">
          {{ log.requestId }}
        </NDescriptionsItem>
        <NDescriptionsItem label="操作时间">
          {{ formatTime(log.time) }}
        </NDescriptionsItem>
        <NDescriptionsItem label="耗时">
          {{ log.durationMs }}ms
        </NDescriptionsItem>
        <NDescriptionsItem label="用户名">
          {{ log.username || '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem label="用户ID">
          {{ log.userId || '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem label="当前角色">
          {{ log.currentRoleCode || '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem label="IP地址">
          {{ log.ip || '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem label="请求方法">
          <NTag :type="methodColor" size="small">
            {{ log.method }}
          </NTag>
        </NDescriptionsItem>
        <NDescriptionsItem label="请求路径">
          {{ log.path }}
        </NDescriptionsItem>
        <NDescriptionsItem label="控制器">
          {{ log.controller || '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem label="处理方法">
          {{ log.handler || '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem label="操作描述" :span="2">
          {{ log.description || log.action || '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem label="执行状态">
          <NTag :type="log.success ? 'success' : 'error'" size="small">
            {{ log.success ? '成功' : '失败' }}
          </NTag>
        </NDescriptionsItem>
        <NDescriptionsItem label="状态码">
          {{ log.statusCode || '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem v-if="!log.success" label="错误码" :span="2">
          {{ log.errorCode || '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem v-if="!log.success" label="错误信息" :span="2">
          {{ log.errorMessage || '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem label="User Agent" :span="2">
          <div class="text-xs break-all">
            {{ log.userAgent || '-' }}
          </div>
        </NDescriptionsItem>
      </NDescriptions>

      <div v-if="log.reqQuery" class="mt-4">
        <div class="mb-2 font-semibold">请求查询参数：</div>
        <NCode :code="formatJson(log.reqQuery)" language="json" />
      </div>

      <div v-if="log.reqParams" class="mt-4">
        <div class="mb-2 font-semibold">请求路径参数：</div>
        <NCode :code="formatJson(log.reqParams)" language="json" />
      </div>

      <div v-if="log.reqBody" class="mt-4">
        <div class="mb-2 font-semibold">请求体：</div>
        <NCode :code="formatJson(log.reqBody)" language="json" />
      </div>

      <div v-if="log.resBody" class="mt-4">
        <div class="mb-2 font-semibold">响应体：</div>
        <NCode :code="formatJson(log.resBody)" language="json" />
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
