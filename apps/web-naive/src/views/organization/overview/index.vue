<script lang="ts" setup>
import { computed, h, onMounted, ref } from 'vue';

import {
  NCard,
  NGrid,
  NGridItem,
  NStatistic,
  NTree,
  NEmpty,
  NSpin,
  NSpace,
  NTag,
  NButton,
} from 'naive-ui';

import { useRouter } from 'vue-router';

import {
  getDepartmentTreeApi,
  getUserListApi,
  getPositionListApi,
  getUserGroupListApi,
  type DepartmentApi,
} from '#/api';

defineOptions({ name: 'OrganizationOverviewPage' });

const router = useRouter();

const loading = ref(false);
const departmentTree = ref<DepartmentApi.Department[]>([]);
const totalUsers = ref(0);
const totalDepartments = ref(0);
const totalPositions = ref(0);
const totalGroups = ref(0);

// Fetch all data
async function fetchOverviewData() {
  loading.value = true;
  try {
    // Fetch departments
    const departments = await getDepartmentTreeApi();
    departmentTree.value = departments;
    totalDepartments.value = countDepartments(departments);

    // Fetch users
    const usersResult = await getUserListApi({ pageSize: 1 });
    totalUsers.value = usersResult.total;

    // Fetch positions
    const positionsResult = await getPositionListApi({ pageSize: 1 });
    totalPositions.value = positionsResult.total;

    // Fetch user groups
    const groupsResult = await getUserGroupListApi({ pageSize: 1 });
    totalGroups.value = groupsResult.total;
  } catch (error) {
    console.error('Failed to fetch overview data:', error);
  } finally {
    loading.value = false;
  }
}

// Count total departments recursively
function countDepartments(departments: DepartmentApi.Department[]): number {
  let count = departments.length;
  for (const dept of departments) {
    if (dept.children && dept.children.length > 0) {
      count += countDepartments(dept.children);
    }
  }
  return count;
}

// Transform department tree for NTree component
const treeData = computed(() => {
  return transformDepartmentTree(departmentTree.value);
});

function transformDepartmentTree(
  departments: DepartmentApi.Department[],
): any[] {
  return departments.map((dept) => ({
    key: dept.id,
    label: dept.name,
    children:
      dept.children && dept.children.length > 0
        ? transformDepartmentTree(dept.children)
        : undefined,
    dept: dept,
  }));
}

// Render tree node label
function renderLabel({ option }: { option: any }) {
  const dept = option.dept as DepartmentApi.Department;
  return h(
    NSpace,
    { align: 'center', size: 8 },
    {
      default: () => [
        h('span', { class: 'font-medium' }, dept.name),
        h('span', { class: 'text-muted-foreground text-sm' }, `(${dept.code})`),
        dept.enable
          ? h(NTag, { type: 'success', size: 'small' }, { default: () => '启用' })
          : h(NTag, { type: 'default', size: 'small' }, { default: () => '停用' }),
      ],
    },
  );
}

// Navigate to specific page
function navigateTo(path: string) {
  router.push(path);
}

onMounted(() => {
  fetchOverviewData();
});
</script>

<template>
  <div class="p-4">
    <NCard title="组织架构总览" :bordered="false" size="small">
      <NSpin :show="loading">
        <!-- Statistics -->
        <NGrid :cols="4" :x-gap="16" :y-gap="16" class="mb-6">
          <NGridItem>
            <NCard :bordered="false" class="cursor-pointer hover:shadow-md transition-shadow" @click="navigateTo('/organization/org')">
              <NStatistic label="部门总数" :value="totalDepartments">
                <template #prefix>
                  <span class="text-2xl">🏢</span>
                </template>
              </NStatistic>
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard :bordered="false" class="cursor-pointer hover:shadow-md transition-shadow" @click="navigateTo('/organization/user')">
              <NStatistic label="用户总数" :value="totalUsers">
                <template #prefix>
                  <span class="text-2xl">👥</span>
                </template>
              </NStatistic>
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard :bordered="false" class="cursor-pointer hover:shadow-md transition-shadow" @click="navigateTo('/organization/position')">
              <NStatistic label="岗位总数" :value="totalPositions">
                <template #prefix>
                  <span class="text-2xl">💼</span>
                </template>
              </NStatistic>
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard :bordered="false" class="cursor-pointer hover:shadow-md transition-shadow" @click="navigateTo('/organization/group')">
              <NStatistic label="用户组总数" :value="totalGroups">
                <template #prefix>
                  <span class="text-2xl">👨‍👩‍👧‍👦</span>
                </template>
              </NStatistic>
            </NCard>
          </NGridItem>
        </NGrid>

        <!-- Department Tree -->
        <NCard title="部门结构" :bordered="false" size="small">
          <template #header-extra>
            <NButton size="small" @click="navigateTo('/organization/org')">
              管理部门
            </NButton>
          </template>
          
          <div v-if="treeData.length > 0" class="max-h-[600px] overflow-auto">
            <NTree
              :data="treeData"
              :render-label="renderLabel"
              block-line
              expand-on-click
              default-expand-all
            />
          </div>
          <NEmpty v-else description="暂无部门数据" />
        </NCard>

        <!-- Quick Actions -->
        <NCard title="快速操作" :bordered="false" size="small" class="mt-4">
          <NSpace :size="12">
            <NButton type="primary" @click="navigateTo('/organization/org')">
              管理部门
            </NButton>
            <NButton type="primary" @click="navigateTo('/organization/user')">
              管理用户
            </NButton>
            <NButton type="primary" @click="navigateTo('/organization/position')">
              管理岗位
            </NButton>
            <NButton type="primary" @click="navigateTo('/organization/group')">
              管理用户组
            </NButton>
          </NSpace>
        </NCard>
      </NSpin>
    </NCard>
  </div>
</template>
