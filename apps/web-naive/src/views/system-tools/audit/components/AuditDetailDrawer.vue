<script lang="ts" setup>
import { computed } from 'vue';
import { NDescriptions, NDescriptionsItem, NDrawer, NDrawerContent, NTag, NCode } from 'naive-ui';
import type { AuditApi } from '#/api';

interface Props {
  show: boolean;
  log: AuditApi.AuditLog | null;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 格式化 JSON
function formatJson(str: string | null | undefined): string {
  if (!str) return '-';
  try {
    const obj = JSON.parse(str);
    return JSON.stringify(obj, null, 2);
  } catch {
    return str;
  }
}

// 状态标签类型
const statusType = computed(() => {
  return props.log?.success === 1 ? 'success' : 'error';
});

// 方法标签类型
const methodType = computed(() => {
  const method = props.log?.method;
  if (method === 'GET') return 'info';
  if (method === 'POST') return 'success';
  if (method === 'DELETE') return 'error';
  return 'warning';
});
</script>

<template>
  <NDrawer
    :show="show"
    :width="800"
    placement="right"
    @update:show="emit('update:show', $event)"
  >
    <NDrawerContent title="审计日志详情" closable>
      <div v-if="log" class="space-y-4">
        <!-- 基本信息 -->
        <NDescriptions bordered :column="2" label-placement="left" :label-style="{ width: '100px' }">
          <NDescriptionsItem label="日志ID">
            {{ log.id }}
          </NDescriptionsItem>
          <NDescriptionsItem label="请求ID">
            {{ log.requestId }}
          </NDescriptionsItem>
          <NDescriptionsItem label="用户ID">
            {{ log.userId || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="用户名">
            {{ log.username || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="当前角色">
            {{ log.currentRoleCode || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="操作时间">
            {{ new Date(log.time).toLocaleString('zh-CN') }}
          </NDescriptionsItem>
        </NDescriptions>

        <!-- 请求信息 -->
        <NDescriptions bordered :column="2" label-placement="left" title="请求信息" :label-style="{ width: '100px' }">
          <NDescriptionsItem label="请求方法">
            <NTag :type="methodType" size="small">
              {{ log.method }}
            </NTag>
          </NDescriptionsItem>
          <NDescriptionsItem label="请求路径">
            {{ log.path }}
          </NDescriptionsItem>
          <NDescriptionsItem label="控制器">
            {{ log.controller || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="处理器">
            {{ log.handler || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="IP 地址">
            {{ log.ip || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="User-Agent" :span="2">
            <div class="break-all" :title="log.userAgent">
              {{ log.userAgent || '-' }}
            </div>
          </NDescriptionsItem>
        </NDescriptions>

        <!-- 操作信息 -->
        <NDescriptions bordered :column="2" label-placement="left" title="操作信息" :label-style="{ width: '100px' }">
          <NDescriptionsItem label="操作类型">
            {{ log.action || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="操作描述">
            {{ log.description || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="执行状态">
            <NTag :type="statusType" size="small">
              {{ log.success === 1 ? '成功' : '失败' }}
            </NTag>
          </NDescriptionsItem>
          <NDescriptionsItem label="状态码">
            {{ log.statusCode || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="执行耗时">
            {{ log.durationMs }}ms
          </NDescriptionsItem>
          <NDescriptionsItem label="错误码">
            {{ log.errorCode || '-' }}
          </NDescriptionsItem>
        </NDescriptions>

        <!-- 错误信息 -->
        <div v-if="log.errorMessage" class="space-y-2">
          <div class="font-semibold">错误信息</div>
          <NCode :code="log.errorMessage" language="text" word-wrap />
        </div>

        <!-- 请求参数 -->
        <div v-if="log.reqQuery" class="space-y-2">
          <div class="font-semibold">Query 参数</div>
          <NCode :code="formatJson(log.reqQuery)" language="json" word-wrap />
        </div>

        <div v-if="log.reqParams" class="space-y-2">
          <div class="font-semibold">Path 参数</div>
          <NCode :code="formatJson(log.reqParams)" language="json" word-wrap />
        </div>

        <div v-if="log.reqBody" class="space-y-2">
          <div class="font-semibold">请求体</div>
          <NCode :code="formatJson(log.reqBody)" language="json" word-wrap />
        </div>

        <!-- 响应数据 -->
        <div v-if="log.resBody" class="space-y-2">
          <div class="font-semibold">响应数据</div>
          <NCode :code="formatJson(log.resBody)" language="json" word-wrap />
        </div>
      </div>
      
      <div v-else class="text-center text-gray-500 py-8">
        暂无数据
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
