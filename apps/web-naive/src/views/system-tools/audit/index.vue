<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { NCard, NAlert } from 'naive-ui';
import AuditTable from './components/AuditTable.vue';
import AuditDetailDrawer from './components/AuditDetailDrawer.vue';
import type { AuditApi } from '#/api/modules/audit';
import { getSecurityConfigApi } from '#/api';

defineOptions({ name: 'AuditLogPage' });

// 详情抽屉状态
const detailDrawerOpen = ref(false);
const selectedLog = ref<AuditApi.AuditLog | null>(null);
const auditEnabled = ref(true);

// 检查审计状态
async function checkAuditStatus() {
  try {
    const config = await getSecurityConfigApi();
    auditEnabled.value = config.auditEnabled;
  } catch (error) {
    // 忽略错误
  }
}

// 处理查看详情
function handleViewDetail(log: AuditApi.AuditLog) {
  selectedLog.value = log;
  detailDrawerOpen.value = true;
}

onMounted(() => {
  checkAuditStatus();
});
</script>

<template>
  <div class="p-4">
    <NCard title="审计日志" :bordered="false">
      <template #header-extra>
        <NAlert
          v-if="!auditEnabled"
          type="warning"
          size="small"
          :show-icon="true"
          class="mb-0"
        >
          审计日志功能当前已在安全配置中禁用，系统将停止记录新的操作。
        </NAlert>
      </template>
      <AuditTable @view-detail="handleViewDetail" />
    </NCard>

    <!-- 详情抽屉 -->
    <AuditDetailDrawer
      v-model:show="detailDrawerOpen"
      :log="selectedLog"
    />
  </div>
</template>
