<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui';
import { computed, h, ref } from 'vue';
import { NButton, NCheckbox, NDataTable, NTag } from 'naive-ui';

export interface PermissionItem {
  key: string;
  label: string;
  id?: number;
}

export interface PermissionNode {
  id: number;
  name: string;
  type?: string;
  children?: PermissionNode[];
  perms?: PermissionItem[];
}

interface Props {
  roleId: number | null;
  roleName: string;
  permissionTree: PermissionNode[];
  selectedPermissions: Set<number>;
  hasChanges: boolean;
  maxHeight?: number;
}

interface Emits {
  (e: 'save'): void;
  (e: 'refresh'): void;
  (e: 'toggleNode', nodeId: number, checked: boolean): void;
  (e: 'togglePermission', permId: number, checked: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  maxHeight: 360,
});

const emit = defineEmits<Emits>();

const expandedRowKeys = ref<number[]>([]);

// 扁平化树结构
function flattenTree(nodes: PermissionNode[]): PermissionNode[] {
  const result: PermissionNode[] = [];
  const walk = (list: PermissionNode[]) => {
    list.forEach((n) => {
      result.push(n);
      if (n.children?.length) {
        walk(n.children);
      }
    });
  };
  walk(nodes);
  return result;
}

const allNodeIds = computed(() => flattenTree(props.permissionTree).map(n => n.id));
const allExpanded = computed(() => expandedRowKeys.value.length >= allNodeIds.value.length);

function expandAll() {
  expandedRowKeys.value = allNodeIds.value;
}

function collapseAll() {
  expandedRowKeys.value = [];
}

// 构建树索引
const treeIndex = computed(() => {
  const nodeById = new Map<number, PermissionNode>();
  const childrenById = new Map<number, number[]>();
  const descendantsById = new Map<number, number[]>();

  const walk = (nodes: PermissionNode[]) => {
    nodes.forEach((n) => {
      nodeById.set(n.id, n);
      const childIds = n.children?.map((c) => c.id) ?? [];
      childrenById.set(n.id, childIds);
      if (n.children?.length) {
        walk(n.children);
      }
    });
  };

  walk(props.permissionTree);

  const getDescendants = (id: number): number[] => {
    if (descendantsById.has(id)) {
      return descendantsById.get(id)!;
    }
    const result = [id];
    const children = childrenById.get(id) ?? [];
    children.forEach((cid) => result.push(...getDescendants(cid)));
    descendantsById.set(id, result);
    return result;
  };

  nodeById.forEach((_v, id) => {
    getDescendants(id);
  });

  return { nodeById, descendantsById };
});

// 获取节点状态
function getNodeState(nodeId: number) {
  const descendants = treeIndex.value.descendantsById.get(nodeId) ?? [nodeId];
  
  if (descendants.length === 0) {
    return { checked: false, indeterminate: false };
  }

  const selected = descendants.reduce(
    (acc, id) => acc + (props.selectedPermissions.has(id) ? 1 : 0),
    0
  );
  
  const checked = selected === descendants.length;
  const indeterminate = selected > 0 && selected < descendants.length;
  
  return { checked, indeterminate };
}

const permissionColumns = computed((): DataTableColumns<PermissionNode> => {
  return [
    {
      title: '',
      key: 'node-check',
      width: 48,
      fixed: 'left',
      align: 'center',
      className: 'perm-node-check-cell',
      render: (row) => {
        const nodeState = getNodeState(row.id);
        return h('div', { class: 'flex items-center justify-center' }, [
          h(NCheckbox, {
            checked: nodeState.checked,
            indeterminate: nodeState.indeterminate,
            onUpdateChecked: (val: boolean) => emit('toggleNode', row.id, val),
          }),
        ]);
      },
    },
    {
      title: '菜单',
      key: 'name',
      width: 250,
      fixed: 'left',
      tree: true,
      className: 'perm-menu-cell',
      ellipsis: {
        tooltip: true,
      },
      render: (row) => {
        let tagType: 'default' | 'info' | 'success' | 'warning' = 'default';
        let tagText = '目录';
        
        const typeMap: Record<string, { type: 'default' | 'info' | 'success' | 'warning'; text: string }> = {
          MODULE: { type: 'warning', text: '模块' },
          DIRECTORY: { type: 'default', text: '目录' },
          MENU: { type: 'info', text: '菜单' },
          BUTTON: { type: 'success', text: '按钮' },
        };
        
        if (row.type && typeMap[row.type]) {
          const mapped = typeMap[row.type]!;
          tagType = mapped.type;
          tagText = mapped.text;
        } else if (row.children?.length) {
          tagType = 'default';
          tagText = '目录';
        } else {
          tagType = 'info';
          tagText = '菜单';
        }
        
        return h('div', { class: 'flex h-full min-w-0 items-center gap-2 whitespace-nowrap' }, [
          h(NTag, { size: 'small', type: tagType, bordered: false }, { default: () => tagText }),
          h('span', { class: 'min-w-0 flex-1 truncate font-medium', title: row.name }, row.name),
        ]);
      },
    },
    {
      title: '权限',
      key: 'perms',
      minWidth: 720,
      render: (row) => {
        if (!row.perms?.length) {
          return h('span', { class: 'text-muted-foreground' }, '');
        }

        return h(
          'div',
          { class: 'flex flex-wrap gap-3' },
          row.perms.map((p) => {
            const permId = p.id || row.id;
            return h(
              NCheckbox,
              {
                checked: props.selectedPermissions.has(permId),
                onUpdateChecked: (val: boolean) => emit('togglePermission', permId, val),
              },
              { default: () => p.label },
            );
          }),
        );
      },
    },
  ];
});
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-3">
        <NButton 
          type="primary" 
          :disabled="!hasChanges"
          @click="emit('save')"
        >
          保存权限
        </NButton>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <NButton tertiary @click="allExpanded ? collapseAll() : expandAll()">
          {{ allExpanded ? '折叠' : '展开' }}
        </NButton>
        <NButton tertiary @click="emit('refresh')">刷新</NButton>
      </div>
    </div>

    <div class="flex-1 min-h-0 rounded-md border border-border">
      <NDataTable
        :columns="permissionColumns"
        :data="permissionTree"
        :row-key="(row) => row.id"
        :scroll-x="840"
        :max-height="maxHeight"
        v-model:expanded-row-keys="expandedRowKeys"
        :indent="24"
        striped
      />
    </div>
  </div>
</template>

<style scoped>
:deep(td.perm-node-check-cell),
:deep(td.perm-menu-cell) {
  vertical-align: middle;
}

:deep(td.perm-node-check-cell) {
  padding-right: 0 !important;
}

:deep(td.perm-node-check-cell .n-data-table-td__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

:deep(td.perm-node-check-cell .n-checkbox) {
  transform: translateY(1px);
}

:deep(td.perm-menu-cell) {
  padding-left: 0 !important;
}

:deep(td.perm-menu-cell .n-data-table-td__content) {
  display: flex;
  align-items: center;
  height: 100%;
}

:deep(td.perm-menu-cell .n-data-table-tree-switcher) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  min-width: 20px;
  margin-right: 8px;
}

:deep(td.perm-menu-cell .n-data-table-tree-switcher--disabled) {
  visibility: hidden;
}

:deep(.n-data-table) {
  .n-data-table-indent {
    width: 24px !important;
    min-width: 24px !important;
    display: inline-block !important;
  }
  
  .n-data-table-td--tree-col {
    .n-data-table-indent {
      width: 24px !important;
      min-width: 24px !important;
    }
  }
  
  .n-data-table-expand-trigger {
    margin-right: 8px;
  }
}

:deep(td.perm-menu-cell .n-data-table-tree-indent) {
  width: 24px !important;
  min-width: 24px !important;
  display: inline-block !important;
}

:deep(.n-data-table .n-data-table-tree-indent) {
  width: 24px !important;
  min-width: 24px !important;
  display: inline-block !important;
}

:deep(.n-data-table-td--tree-col) {
  padding-left: 8px !important;
}

:deep(.n-data-table-indent) {
  width: 24px !important;
  min-width: 24px !important;
  display: inline-block !important;
}

:deep(.n-data-table .n-data-table-indent) {
  display: inline-block !important;
  width: 24px !important;
  min-width: 24px !important;
}

:deep(td.perm-menu-cell .n-data-table-tree-switcher + *) {
  min-width: 0;
  display: flex;
  align-items: center;
  height: 100%;
}
</style>
