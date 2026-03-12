<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { 
  NCheckbox, 
  NDivider, 
  NCollapse, 
  NCollapseItem,
  NTag,
  NSpace,
  NAlert,
  NIcon,
  NTooltip
} from 'naive-ui';
import { IconifyIcon } from '@vben/icons';

interface PermissionItem {
  code: string;
  name: string;
  description: string;
  method: string;
  path: string;
}

interface PermissionGroup {
  code: string;
  name: string;
  description: string;
  category: string;
  children?: PermissionItem[];
}

interface Props {
  permissions: PermissionGroup[];
  modelValue: string[];
  error?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 展开的分组
const expandedKeys = ref<string[]>([]);

// 选中的权限
const selectedPermissions = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// 全局权限
const globalPermissions = computed(() => 
  props.permissions.filter(p => p.category === 'global')
);

// 分组权限
const groupedPermissions = computed(() => 
  props.permissions.filter(p => p.category !== 'global')
);

// 全选状态
const isAllSelected = computed(() => {
  const allCodes = getAllPermissionCodes();
  return allCodes.length > 0 && allCodes.every(code => selectedPermissions.value.includes(code));
});

const isIndeterminate = computed(() => {
  const allCodes = getAllPermissionCodes();
  const selectedCount = selectedPermissions.value.length;
  return selectedCount > 0 && selectedCount < allCodes.length;
});

// 获取所有权限代码
function getAllPermissionCodes(): string[] {
  const codes: string[] = [];
  
  // 全局权限
  globalPermissions.value.forEach(p => codes.push(p.code));
  
  // 分组权限下的具体权限
  groupedPermissions.value.forEach(group => {
    if (group.children) {
      group.children.forEach(child => codes.push(child.code));
    }
  });
  
  return codes;
}

// 获取分组的选中状态
function getGroupCheckState(group: PermissionGroup) {
  if (!group.children || group.children.length === 0) {
    return { checked: false, indeterminate: false };
  }
  
  const childCodes = group.children.map(c => c.code);
  const selectedCount = childCodes.filter(code => selectedPermissions.value.includes(code)).length;
  
  return {
    checked: selectedCount === childCodes.length,
    indeterminate: selectedCount > 0 && selectedCount < childCodes.length,
  };
}

// 全选/取消全选
function handleSelectAll(checked: boolean) {
  if (checked) {
    // 选中所有权限：全局权限 + 所有具体权限
    selectedPermissions.value = getAllPermissionCodes();
  } else {
    // 取消全选
    selectedPermissions.value = [];
  }
}

// 分组选择
function handleGroupSelect(group: PermissionGroup, checked: boolean) {
  if (!group.children || group.children.length === 0) {
    return;
  }
  
  const childCodes = group.children.map(c => c.code);
  
  if (checked) {
    // 添加分组下所有具体权限
    const newSelected = [...selectedPermissions.value];
    childCodes.forEach(code => {
      if (!newSelected.includes(code)) {
        newSelected.push(code);
      }
    });
    selectedPermissions.value = newSelected;
  } else {
    // 移除分组下所有具体权限
    selectedPermissions.value = selectedPermissions.value.filter(code => !childCodes.includes(code));
  }
}

// 单个权限选择
function handlePermissionSelect(code: string, checked: boolean) {
  if (checked) {
    if (!selectedPermissions.value.includes(code)) {
      selectedPermissions.value = [...selectedPermissions.value, code];
    }
  } else {
    selectedPermissions.value = selectedPermissions.value.filter(c => c !== code);
  }
}

// 获取HTTP方法的颜色
function getMethodColor(method: string) {
  const colors: Record<string, string> = {
    'GET': 'success',
    'POST': 'info',
    'PATCH': 'warning',
    'PUT': 'warning',
    'DELETE': 'error',
  };
  return colors[method] || 'default';
}

// 初始化展开所有分组
watch(() => props.permissions, (newPermissions) => {
  if (newPermissions.length > 0) {
    expandedKeys.value = groupedPermissions.value.map(g => g.code);
  }
}, { immediate: true });
</script>

<template>
  <div class="permission-selector">
    <!-- 全选控制 -->
    <div class="mb-4">
      <NCheckbox
        :checked="isAllSelected"
        :indeterminate="isIndeterminate"
        @update:checked="handleSelectAll"
      >
        <span class="font-medium">全选权限</span>
        <span class="ml-2 text-sm opacity-60">
          ({{ selectedPermissions.length }}/{{ getAllPermissionCodes().length }})
        </span>
      </NCheckbox>
    </div>

    <NDivider class="!my-4" />

    <!-- 全局权限 -->
    <div v-if="globalPermissions.length > 0" class="mb-6">
      <h4 class="text-sm font-medium mb-3 flex items-center">
        <NIcon class="mr-2"><IconifyIcon icon="lucide:globe" /></NIcon>
        全局权限
      </h4>
      <div class="space-y-2">
        <div
          v-for="permission in globalPermissions"
          :key="permission.code"
          class="permission-item flex items-start p-3 rounded-md border transition-all duration-200"
        >
          <NCheckbox 
            :checked="selectedPermissions.includes(permission.code)"
            @update:checked="(checked) => handlePermissionSelect(permission.code, checked)"
            class="mr-3 mt-0.5" 
          />
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm">{{ permission.name }}</div>
            <div class="text-xs opacity-60 mt-1 leading-relaxed">{{ permission.description }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分组权限 -->
    <div v-if="groupedPermissions.length > 0">
      <h4 class="text-sm font-medium mb-3 flex items-center">
        <NIcon class="mr-2"><IconifyIcon icon="lucide:layers" /></NIcon>
        功能权限
      </h4>
      
      <NCollapse v-model:expanded-names="expandedKeys" accordion>
        <NCollapseItem
          v-for="group in groupedPermissions"
          :key="group.code"
          :name="group.code"
        >
          <template #header>
            <div class="flex items-center w-full" @click.stop>
              <NCheckbox
                :checked="getGroupCheckState(group).checked"
                :indeterminate="getGroupCheckState(group).indeterminate"
                @update:checked="(checked) => handleGroupSelect(group, checked)"
                class="mr-3"
              />
              <div class="flex-1">
                <div class="font-medium">{{ group.name }}</div>
                <div class="text-xs opacity-60 mt-1">{{ group.description }}</div>
              </div>
              <div class="text-xs opacity-60 ml-2">
                {{ group.children?.length || 0 }} 个接口
              </div>
            </div>
          </template>

          <!-- 分组权限说明 -->
          <div class="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div class="flex items-start">
              <div class="flex-1">
                <div class="font-medium text-sm">{{ group.name }}（分组权限）</div>
                <div class="text-xs opacity-60 mt-1">拥有此分组下所有接口的权限</div>
                <NTag size="small" type="info" class="mt-2">
                  {{ group.code }}
                </NTag>
              </div>
            </div>
          </div>

          <!-- 具体接口权限 -->
          <div v-if="group.children && group.children.length > 0" class="space-y-2">
            <div class="text-xs font-medium opacity-60 mb-2">具体接口权限：</div>
            <div
              v-for="child in group.children"
              :key="child.code"
              class="permission-item flex items-start p-3 rounded-md border transition-all duration-200"
            >
              <NCheckbox 
                :checked="selectedPermissions.includes(child.code)"
                @update:checked="(checked) => handlePermissionSelect(child.code, checked)"
                class="mr-3 mt-0.5" 
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-sm">{{ child.name }}</span>
                  <NTag :type="getMethodColor(child.method) as any" size="small">
                    {{ child.method }}
                  </NTag>
                </div>
                <div class="text-xs opacity-60 mb-2 leading-relaxed">{{ child.description }}</div>
                <div class="flex items-center gap-2">
                  <NTooltip>
                    <template #trigger>
                      <NTag size="small" type="default" class="font-mono text-xs">
                        {{ child.path }}
                      </NTag>
                    </template>
                    <span>API 路径</span>
                  </NTooltip>
                  <NTooltip>
                    <template #trigger>
                      <NTag size="small" type="default" class="font-mono text-xs">
                        {{ child.code }}
                      </NTag>
                    </template>
                    <span>权限代码</span>
                  </NTooltip>
                </div>
              </div>
            </div>
          </div>
        </NCollapseItem>
      </NCollapse>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="mt-4">
      <NAlert type="error" :show-icon="false" size="small">
        {{ error }}
      </NAlert>
    </div>

    <!-- 选中权限统计 -->
    <div v-if="selectedPermissions.length > 0" class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
      <div class="text-sm font-medium mb-2">已选择权限 ({{ selectedPermissions.length }})：</div>
      <NSpace size="small">
        <NTag
          v-for="code in selectedPermissions.slice(0, 10)"
          :key="code"
          size="small"
          type="info"
          closable
          @close="handlePermissionSelect(code, false)"
        >
          {{ code }}
        </NTag>
        <NTag v-if="selectedPermissions.length > 10" size="small" type="default">
          +{{ selectedPermissions.length - 10 }} 更多...
        </NTag>
      </NSpace>
    </div>
  </div>
</template>

<style scoped>
.permission-item {
  transition: all 0.2s ease;
}

.permission-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .permission-item:hover {
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
}

/* 折叠面板自定义样式 */
:deep(.n-collapse-item__header) {
  padding: 12px 0;
}

:deep(.n-collapse-item__content-wrapper) {
  padding-top: 0;
}

:deep(.n-collapse-item__content-inner) {
  padding-top: 0;
}
</style>
