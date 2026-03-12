<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { NCard, NTabPane, NTabs } from 'naive-ui';
import { dialog, message } from '#/adapter/naive';
import { useWindowSize } from '@vueuse/core';

import {
  addRolePermissionsApi,
  addRoleUsersApi,
  createRoleApi,
  deleteRoleApi,
  getRolePageApi,
  getRolePermissionsApi,
  getRolePermissionsTreeApi,
  getRoleUsersApi,
  removeRoleUsersApi,
  updateRoleApi,
  type RoleApi,
} from '#/api';

import ApplyModal from './applyModal.vue';
import { RoleList, RolePermissions, RoleUsers } from './components';
import type { RoleRecord, PermissionNode } from './components';

defineOptions({ name: 'PermissionRolePage' });

// ==================== 角色列表相关 ====================
const roles = ref<RoleRecord[]>([]);
const loading = ref(false);
const activeRoleId = ref<number | null>(null);

const activeRole = computed(
  () => roles.value.find((r) => r.id === activeRoleId.value) ?? null,
);

async function fetchRoles() {
  loading.value = true;
  try {
    const result = await getRolePageApi({ page: 1, pageSize: 100 });
    const items = result.pageData || [];
    
    roles.value = items.map(item => ({
      id: item.id,
      name: item.name,
      code: item.code,
      enabled: item.enabled,
      description: item.description,
    }));
    
    if (roles.value.length > 0 && !activeRoleId.value) {
      activeRoleId.value = roles.value[0]?.id ?? null;
    }
  } catch (error) {
    message.error('加载角色列表失败');
  } finally {
    loading.value = false;
  }
}

// 角色模态框相关
const modalOpen = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const modalInitialValues = ref<{
  code?: string;
  description?: string;
  enabled?: boolean;
  name?: string;
}>({});
const originalCode = ref<string | undefined>(undefined);
const editingId = ref<number | null>(null);

const existingCodes = computed(() => roles.value.map((r) => r.code));

function openCreateRole() {
  modalMode.value = 'create';
  editingId.value = null;
  originalCode.value = undefined;
  modalInitialValues.value = {
    name: '',
    code: '',
    enabled: true,
    description: '',
  };
  modalOpen.value = true;
}

function openEditRole(role: RoleRecord) {
  modalMode.value = 'edit';
  editingId.value = role.id;
  originalCode.value = role.code;
  modalInitialValues.value = {
    name: role.name,
    code: role.code,
    enabled: role.enabled,
    description: role.description ?? '',
  };
  modalOpen.value = true;
}

function deleteRole(role: RoleRecord) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除角色「${role.name}」吗？\n\n注意：\n• 如果该角色已分配给用户，需要先解除用户绑定\n• 删除后，该角色的所有权限配置将被清除\n• 此操作不可恢复`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteRoleApi(role.id);
        message.success('删除成功');
        await fetchRoles();
        
        // 清除相关数据
        clearRoleData(role.id);

        if (activeRoleId.value === role.id) {
          activeRoleId.value = roles.value[0]?.id ?? null;
        }
      } catch {
        // Error handled by interceptor
      }
    },
  });
}

async function handleRoleSubmit(values: {
  code: string;
  description: string;
  enabled: boolean;
  name: string;
}) {
  try {
    if (modalMode.value === 'create') {
      await createRoleApi(values);
      message.success('新增成功');
    } else {
      if (!editingId.value) {
        message.error('编辑角色ID丢失，请重新打开编辑');
        return;
      }
      await updateRoleApi(editingId.value, values);
      message.success('保存成功');
    }
    
    modalOpen.value = false;
    await fetchRoles();
  } catch {
    // Error handled by interceptor
  }
}

// 清除角色相关数据
function clearRoleData(roleId: number) {
  roleUsersMap.value.delete(roleId);
  originalRoleUsersMap.value.delete(roleId);
  rolePermMap.value.delete(roleId);
  originalRolePermMap.value.delete(roleId);
}

// ==================== 权限相关 ====================
const permissionTree = ref<PermissionNode[]>([]);
const rolePermMap = ref<Map<number, Set<number>>>(new Map());
const originalRolePermMap = ref<Map<number, Set<number>>>(new Map());
const permissionRefreshKey = ref(0);

async function fetchPermissionTree() {
  try {
    const result = await getRolePermissionsTreeApi();
    permissionTree.value = transformPermissionTree(result);
  } catch (error) {
    message.error('加载权限树失败');
  }
}

function transformPermissionTree(nodes: RoleApi.PermissionTreeNode[]): PermissionNode[] {
  return nodes.map(node => {
    const transformed: PermissionNode = {
      id: node.id,
      name: node.name,
      type: node.type,
    };
    
    if (node.children?.length) {
      const buttons = node.children.filter(child => child.type === 'BUTTON');
      const otherChildren = node.children.filter(child => child.type !== 'BUTTON');
      
      if (node.type === 'MENU' && buttons.length > 0) {
        transformed.perms = buttons.map(btn => ({
          key: btn.code || btn.id.toString(),
          label: btn.name,
          id: btn.id,
        }));
      }
      
      if (otherChildren.length > 0) {
        transformed.children = transformPermissionTree(otherChildren);
      }
    }
    
    return transformed;
  });
}

// 提取权限ID
function extractPermissionIds(permissions: any[]): number[] {
  return Array.isArray(permissions) 
    ? permissions.map((p: any) => p.id).filter((id: any) => id != null)
    : [];
}

// 更新角色权限
function updateRolePermissions(roleId: number, permissionIds: number[]) {
  rolePermMap.value.set(roleId, new Set(permissionIds));
  originalRolePermMap.value.set(roleId, new Set(permissionIds));
  permissionRefreshKey.value++;
}

// 加载角色权限
async function loadRolePermissions(roleId: number) {
  try {
    const permissions = await getRolePermissionsApi(roleId);
    const permissionIds = extractPermissionIds(permissions);
    updateRolePermissions(roleId, permissionIds);
  } catch {
    // Error handled by interceptor
  }
}

const selectedPermissions = computed(() => {
  void permissionRefreshKey.value;
  if (!activeRoleId.value) return new Set<number>();
  return rolePermMap.value.get(activeRoleId.value) || new Set<number>();
});

const hasPermissionChanges = computed(() => {
  void permissionRefreshKey.value;
  
  if (!activeRoleId.value) return false;
  
  const originalPermSet = originalRolePermMap.value.get(activeRoleId.value);
  const currentPermSet = rolePermMap.value.get(activeRoleId.value);
  
  if (!originalPermSet || !currentPermSet) return false;
  if (originalPermSet.size !== currentPermSet.size) return true;
  
  for (const id of currentPermSet) {
    if (!originalPermSet.has(id)) return true;
  }
  
  return false;
});

const treeIndex = computed(() => {
  const nodeById = new Map<number, PermissionNode>();
  const childrenById = new Map<number, number[]>();
  const descendantsById = new Map<number, number[]>();

  const walk = (nodes: PermissionNode[]) => {
    nodes.forEach((n) => {
      nodeById.set(n.id, n);
      const childIds = n.children?.map((c) => c.id) ?? [];
      childrenById.set(n.id, childIds);
      if (n.children?.length) walk(n.children);
    });
  };

  walk(permissionTree.value);

  const getDescendants = (id: number): number[] => {
    if (descendantsById.has(id)) return descendantsById.get(id)!;
    
    const result = [id];
    const children = childrenById.get(id) ?? [];
    children.forEach((cid) => result.push(...getDescendants(cid)));
    descendantsById.set(id, result);
    return result;
  };

  nodeById.forEach((_v, id) => getDescendants(id));

  return { nodeById, descendantsById };
});

function getRolePermSet(roleId: number) {
  if (!rolePermMap.value.has(roleId)) {
    rolePermMap.value.set(roleId, new Set());
  }
  return rolePermMap.value.get(roleId)!;
}

function handleToggleNode(nodeId: number, checked: boolean) {
  if (!activeRoleId.value) return;
  
  const permSet = getRolePermSet(activeRoleId.value);
  const descendants = treeIndex.value.descendantsById.get(nodeId) ?? [nodeId];
  
  descendants.forEach((id) => {
    checked ? permSet.add(id) : permSet.delete(id);
  });
  
  permissionRefreshKey.value++;
}

function handleTogglePermission(permId: number, checked: boolean) {
  if (!activeRoleId.value) return;
  
  const permSet = getRolePermSet(activeRoleId.value);
  checked ? permSet.add(permId) : permSet.delete(permId);
  permissionRefreshKey.value++;
}

async function handleSavePermission() {
  if (!activeRole.value || !activeRoleId.value) return;
  
  try {
    const permissionIds = Array.from(getRolePermSet(activeRoleId.value));
    
    await addRolePermissionsApi({
      id: activeRoleId.value,
      permissionIds,
    });
    
    // 等待后端保存完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 重新加载权限
    await loadRolePermissions(activeRoleId.value);
    
    message.success(`已保存「${activeRole.value.name}」权限`);
  } catch {
    // Error handled by interceptor
  }
}

async function handleRefreshPermission() {
  try {
    await fetchPermissionTree();
    
    if (activeRoleId.value) {
      await loadRolePermissions(activeRoleId.value);
    }
    
    message.success('刷新成功');
  } catch {
    message.error('刷新失败');
  }
}

// ==================== 用户相关 ====================
const roleUsersMap = ref(new Map<number, number[]>());
const originalRoleUsersMap = ref(new Map<number, number[]>());
const roleUsersRefreshKey = ref(0);

// 更新角色用户
function updateRoleUsers(roleId: number, userIds: number[]) {
  roleUsersMap.value.set(roleId, userIds);
  originalRoleUsersMap.value.set(roleId, [...userIds]);
  roleUsersRefreshKey.value++;
}

// 加载角色用户
async function loadRoleUsers(roleId: number) {
  try {
    const role = await getRoleUsersApi(roleId);
    const userIds = role.users?.map((u: any) => u.id) || [];
    updateRoleUsers(roleId, userIds);
  } catch {
    updateRoleUsers(roleId, []);
  }
}

// 统一加载角色数据（权限和用户）
async function loadRoleData(roleId: number) {
  if (!roleId) return;
  
  // 并发加载权限和用户数据
  await Promise.all([
    loadRolePermissions(roleId),
    loadRoleUsers(roleId),
  ]);
}

// 监听角色切换，加载角色数据
watch(activeRoleId, (newRoleId) => {
  if (newRoleId) {
    loadRoleData(newRoleId);
  }
}, { immediate: true });

const selectedUserIds = computed({
  get() {
    void roleUsersRefreshKey.value;
    if (!activeRoleId.value) return [];
    return roleUsersMap.value.get(activeRoleId.value) ?? [];
  },
  set(val: number[]) {
    if (!activeRoleId.value) return;
    roleUsersMap.value.set(activeRoleId.value, val);
    roleUsersRefreshKey.value++;
  },
});

const hasRoleUsersChanges = computed(() => {
  void roleUsersRefreshKey.value;
  
  if (!activeRoleId.value) return false;
  
  const originalUserIds = originalRoleUsersMap.value.get(activeRoleId.value) || [];
  const currentUserIds = selectedUserIds.value;
  
  if (originalUserIds.length !== currentUserIds.length) return true;
  
  const sortedOriginal = [...originalUserIds].sort((a, b) => a - b);
  const sortedCurrent = [...currentUserIds].sort((a, b) => a - b);
  
  return !sortedOriginal.every((id, index) => id === sortedCurrent[index]);
});

function handleAddUser(userId: number) {
  selectedUserIds.value = [...selectedUserIds.value, userId];
}

function handleRemoveUser(userId: number) {
  selectedUserIds.value = selectedUserIds.value.filter((id) => id !== userId);
}

async function handleSaveRoleUsers() {
  if (!activeRole.value || !activeRoleId.value) return;
  
  try {
    const currentUserIds = originalRoleUsersMap.value.get(activeRoleId.value) || [];
    const newUserIds = selectedUserIds.value;
    
    const toAdd = newUserIds.filter(id => !currentUserIds.includes(id));
    const toRemove = currentUserIds.filter(id => !newUserIds.includes(id));
    
    if (toAdd.length === 0 && toRemove.length === 0) {
      message.info('没有需要保存的更改');
      return;
    }
    
    if (toRemove.length > 0) {
      await removeRoleUsersApi(activeRoleId.value, { userIds: toRemove });
    }
    
    if (toAdd.length > 0) {
      await addRoleUsersApi(activeRoleId.value, { userIds: toAdd });
    }
    
    updateRoleUsers(activeRoleId.value, newUserIds);
    
    message.success(`已保存「${activeRole.value.name}」角色用户`);
  } catch {
    // Error handled by interceptor
  }
}

// ==================== 布局相关 ====================
const { height: windowHeight } = useWindowSize();
const panelHeight = computed(() => Math.max(640, windowHeight.value - 140));
const permissionTableMaxHeight = computed(() => Math.max(360, panelHeight.value - 260));
const usersPanelMinHeight = computed(() => Math.max(360, panelHeight.value - 220));

// ==================== 初始化 ====================
onMounted(() => {
  fetchRoles();
  fetchPermissionTree();
});
</script>

<template>
  <div class="p-4" :style="{ height: `${panelHeight}px` }">
    <div class="flex h-full gap-4">
      <!-- 左侧角色列表 -->
      <RoleList
        :roles="roles"
        :loading="loading"
        :active-role-id="activeRoleId"
        @update:active-role-id="activeRoleId = $event"
        @create="openCreateRole"
        @edit="openEditRole"
        @delete="deleteRole"
      />

      <!-- 右侧内容区域 -->
      <NCard
        :bordered="false"
        size="small"
        class="min-w-0 flex-1 h-full"
        content-style="height: 100%; display: flex; flex-direction: column;"
      >
        <div class="mb-2 min-h-0 flex-1">
          <NTabs type="line" animated class="h-full">
            <!-- 功能权限标签页 -->
            <NTabPane name="permission" tab="功能权限">
              <RolePermissions
                :role-id="activeRoleId"
                :role-name="activeRole?.name || ''"
                :permission-tree="permissionTree"
                :selected-permissions="selectedPermissions"
                :has-changes="hasPermissionChanges"
                :max-height="permissionTableMaxHeight"
                @save="handleSavePermission"
                @refresh="handleRefreshPermission"
                @toggle-node="handleToggleNode"
                @toggle-permission="handleTogglePermission"
              />
            </NTabPane>

            <!-- 角色用户标签页 -->
            <NTabPane name="users" tab="角色用户">
              <RoleUsers
                :role-id="activeRoleId"
                :role-name="activeRole?.name || ''"
                :selected-user-ids="selectedUserIds"
                :has-changes="hasRoleUsersChanges"
                :min-height="usersPanelMinHeight"
                @save="handleSaveRoleUsers"
                @add-user="handleAddUser"
                @remove-user="handleRemoveUser"
              />
            </NTabPane>
          </NTabs>
        </div>
      </NCard>
    </div>

    <!-- 角色编辑模态框 -->
    <ApplyModal
      v-model:show="modalOpen"
      :mode="modalMode"
      :initial-values="modalInitialValues"
      :existing-codes="existingCodes"
      :original-code="originalCode"
      @submit="handleRoleSubmit"
    />
  </div>
</template>
