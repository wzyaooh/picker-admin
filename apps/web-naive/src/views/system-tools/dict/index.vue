<script lang="ts" setup>
import { ref } from 'vue';
import { NCard, NGrid, NGridItem } from 'naive-ui';
import DictTable from './components/DictTable.vue';
import DictItemTable from './components/DictItemTable.vue';
import DictModal from './components/DictModal.vue';
import DictItemModal from './components/DictItemModal.vue';
import type { DictApi } from '#/api/modules/dict';

defineOptions({ name: 'DictManagePage' });

// 状态管理
const selectedDictId = ref<number | null>(null);
const selectedDictCode = ref<string>('');

// 字典模态框状态
const dictModalOpen = ref(false);
const dictModalMode = ref<'create' | 'edit'>('create');
const dictInitialValues = ref<Partial<DictApi.Dict> | undefined>(undefined);

// 字典项模态框状态
const dictItemModalOpen = ref(false);
const dictItemModalMode = ref<'create' | 'edit'>('create');
const dictItemInitialValues = ref<Partial<DictApi.DictItem> | undefined>(
  undefined,
);

// 引用组件
const dictTableRef = ref<InstanceType<typeof DictTable>>();
const dictItemTableRef = ref<InstanceType<typeof DictItemTable>>();

// 处理字典选择
function handleDictSelect(dict: DictApi.Dict) {
  selectedDictId.value = dict.id;
  selectedDictCode.value = dict.code;
}

// 处理字典刷新（清空选中状态）
function handleDictRefresh() {
  selectedDictId.value = null;
  selectedDictCode.value = '';
}

// 处理创建字典
function handleDictCreate() {
  dictModalMode.value = 'create';
  dictInitialValues.value = undefined;
  dictModalOpen.value = true;
}

// 处理编辑字典
function handleDictEdit(dict: DictApi.Dict) {
  dictModalMode.value = 'edit';
  dictInitialValues.value = dict;
  dictModalOpen.value = true;
}

// 处理字典表单提交成功
function handleDictSubmit() {
  // 刷新字典列表
  dictTableRef.value?.fetchData();
}

// 处理创建字典项
function handleDictItemCreate() {
  dictItemModalMode.value = 'create';
  dictItemInitialValues.value = undefined;
  dictItemModalOpen.value = true;
}

// 处理编辑字典项
function handleDictItemEdit(item: DictApi.DictItem) {
  dictItemModalMode.value = 'edit';
  dictItemInitialValues.value = item;
  dictItemModalOpen.value = true;
}

// 处理字典项表单提交成功
function handleDictItemSubmit() {
  // 刷新字典项列表
  dictItemTableRef.value?.fetchData();
}
</script>

<template>
  <div class="p-4">
    <NGrid :cols="2" :x-gap="16">
      <!-- 左侧：字典列表 -->
      <NGridItem>
        <NCard title="字典列表" :bordered="false">
          <DictTable
            ref="dictTableRef"
            @select="handleDictSelect"
            @refresh="handleDictRefresh"
            @create="handleDictCreate"
            @edit="handleDictEdit"
          />
        </NCard>
      </NGridItem>

      <!-- 右侧：字典项列表 -->
      <NGridItem>
        <NCard title="字典项列表" :bordered="false">
          <DictItemTable
            ref="dictItemTableRef"
            :dict-id="selectedDictId"
            :dict-code="selectedDictCode"
            @create="handleDictItemCreate"
            @edit="handleDictItemEdit"
          />
        </NCard>
      </NGridItem>
    </NGrid>

    <!-- 字典表单模态框 -->
    <DictModal
      v-model:show="dictModalOpen"
      :mode="dictModalMode"
      :initial-values="dictInitialValues"
      @submit="handleDictSubmit"
    />

    <!-- 字典项表单模态框 -->
    <DictItemModal
      v-model:show="dictItemModalOpen"
      :dict-id="selectedDictId"
      :mode="dictItemModalMode"
      :initial-values="dictItemInitialValues"
      @submit="handleDictItemSubmit"
    />
  </div>
</template>
