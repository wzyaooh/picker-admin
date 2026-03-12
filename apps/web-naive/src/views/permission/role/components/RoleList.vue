<script lang="ts" setup>
import { computed, ref } from 'vue';
import { NBadge, NButton, NCard, NInput, NScrollbar } from 'naive-ui';

export interface RoleRecord {
  id: number;
  name: string;
  code: string;
  description?: string;
  enabled: boolean;
}

interface Props {
  roles: RoleRecord[];
  loading?: boolean;
  activeRoleId: number | null;
}

interface Emits {
  (e: 'update:activeRoleId', value: number | null): void;
  (e: 'create'): void;
  (e: 'edit', role: RoleRecord): void;
  (e: 'delete', role: RoleRecord): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

const roleKeyword = ref('');

const filteredRoles = computed(() => {
  const k = roleKeyword.value.trim().toLowerCase();
  if (!k) return props.roles;
  return props.roles.filter(
    (r) => r.name.toLowerCase().includes(k) || r.code.toLowerCase().includes(k),
  );
});

function handleRoleClick(roleId: number) {
  emit('update:activeRoleId', roleId);
}
</script>

<template>
  <NCard
    :bordered="false"
    size="small"
    class="w-[320px] flex-shrink-0 h-full"
    content-style="height: 100%; display: flex; flex-direction: column;"
  >
    <div class="flex items-center gap-2">
      <NInput
        v-model:value="roleKeyword"
        clearable
        placeholder="搜索名称/编码"
        class="flex-1"
      />
      <NButton type="primary" class="!h-9 !w-9" @click="emit('create')">
        +
      </NButton>
    </div>

    <div class="mt-3 flex-1 min-h-0">
      <NScrollbar class="h-full">
        <div v-if="loading" class="flex items-center justify-center py-8 text-muted-foreground">
          加载中...
        </div>
        <div v-else-if="filteredRoles.length === 0" class="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <div class="text-4xl mb-2">📋</div>
          <div>{{ roleKeyword ? '未找到匹配的角色' : '暂无角色数据' }}</div>
          <NButton v-if="!roleKeyword" type="primary" size="small" class="mt-3" @click="emit('create')">
            创建第一个角色
          </NButton>
        </div>
        <div v-else class="flex flex-col gap-2">
          <button
            v-for="role in filteredRoles"
            :key="role.id"
            type="button"
            class="group rounded-md border px-3 py-2 text-left transition"
            :class="
              activeRoleId === role.id
                ? 'border-primary bg-primary/10'
                : 'border-transparent hover:bg-accent/50'
            "
            @click="handleRoleClick(role.id)"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="truncate font-medium">{{ role.name }}</span>
                  <NBadge v-if="!role.enabled" dot type="error" />
                </div>
                <div class="text-muted-foreground mt-1 truncate text-xs">
                  {{ role.code }}
                </div>
              </div>

              <div
                class="flex items-center gap-2 transition-opacity"
                :class="activeRoleId === role.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
              >
                <NButton
                  size="tiny"
                  tertiary
                  type="primary"
                  @click.stop="emit('edit', role)"
                >
                  编辑
                </NButton>
                <NButton
                  size="tiny"
                  tertiary
                  type="error"
                  @click.stop="emit('delete', role)"
                >
                  删除
                </NButton>
              </div>
            </div>
          </button>
        </div>
      </NScrollbar>
    </div>
  </NCard>
</template>
