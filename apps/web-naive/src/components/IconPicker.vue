<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IconifyIcon } from '@vben/icons';
import { NInput, NPopover, NTabs, NTabPane, NEmpty } from 'naive-ui';

interface Props {
  value?: string;
  placeholder?: string;
}

interface Emits {
  (e: 'update:value', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  placeholder: '请选择图标',
});

const emit = defineEmits<Emits>();

const showPopover = ref(false);
const searchKeyword = ref('');
const activeTab = ref('common');

// 常用图标列表（分类）
const iconCategories = [
  {
    key: 'common',
    name: '常用',
    icons: [
      'mdi:home',
      'mdi:account',
      'mdi:account-circle',
      'mdi:cog',
      'mdi:cog-outline',
      'mdi:file-document',
      'mdi:file-document-outline',
      'mdi:folder',
      'mdi:folder-outline',
      'mdi:chart-line',
      'mdi:chart-bar',
      'mdi:database',
      'mdi:shield-account',
      'mdi:shield-check',
      'mdi:bell',
      'mdi:bell-outline',
      'mdi:email',
      'mdi:email-outline',
      'mdi:calendar',
      'mdi:calendar-outline',
      'mdi:clock',
      'mdi:clock-outline',
      'mdi:map-marker',
      'mdi:phone',
      'mdi:message',
      'mdi:image',
      'mdi:star',
      'mdi:star-outline',
      'mdi:heart',
      'mdi:heart-outline',
      'mdi:bookmark',
      'mdi:bookmark-outline',
    ],
  },
  {
    key: 'system',
    name: '系统',
    icons: [
      'mdi:cog',
      'mdi:cog-outline',
      'mdi:shield-check',
      'mdi:shield-check-outline',
      'mdi:account-group',
      'mdi:account-group-outline',
      'mdi:key',
      'mdi:key-variant',
      'mdi:lock',
      'mdi:lock-outline',
      'mdi:lock-open',
      'mdi:lock-open-outline',
      'mdi:eye',
      'mdi:eye-outline',
      'mdi:eye-off',
      'mdi:eye-off-outline',
      'mdi:refresh',
      'mdi:sync',
      'mdi:download',
      'mdi:download-outline',
      'mdi:upload',
      'mdi:upload-outline',
      'mdi:delete',
      'mdi:delete-outline',
      'mdi:pencil',
      'mdi:pencil-outline',
      'mdi:plus',
      'mdi:plus-circle',
      'mdi:plus-circle-outline',
      'mdi:minus',
      'mdi:minus-circle',
      'mdi:minus-circle-outline',
      'mdi:check',
      'mdi:check-circle',
      'mdi:check-circle-outline',
      'mdi:close',
      'mdi:close-circle',
      'mdi:close-circle-outline',
      'mdi:alert',
      'mdi:alert-circle',
      'mdi:alert-circle-outline',
      'mdi:information',
      'mdi:information-outline',
      'mdi:help-circle',
      'mdi:help-circle-outline',
    ],
  },
  {
    key: 'file',
    name: '文件',
    icons: [
      'mdi:file',
      'mdi:file-outline',
      'mdi:file-document',
      'mdi:file-document-outline',
      'mdi:file-pdf',
      'mdi:file-pdf-outline',
      'mdi:file-excel',
      'mdi:file-excel-outline',
      'mdi:file-word',
      'mdi:file-word-outline',
      'mdi:file-powerpoint',
      'mdi:file-powerpoint-outline',
      'mdi:file-image',
      'mdi:file-image-outline',
      'mdi:file-video',
      'mdi:file-video-outline',
      'mdi:file-music',
      'mdi:file-music-outline',
      'mdi:file-code',
      'mdi:file-code-outline',
      'mdi:folder',
      'mdi:folder-outline',
      'mdi:folder-open',
      'mdi:folder-open-outline',
      'mdi:folder-plus',
      'mdi:folder-plus-outline',
      'mdi:archive',
      'mdi:archive-outline',
      'mdi:zip-box',
      'mdi:zip-box-outline',
      'mdi:cloud',
      'mdi:cloud-outline',
      'mdi:cloud-upload',
      'mdi:cloud-upload-outline',
      'mdi:cloud-download',
      'mdi:cloud-download-outline',
    ],
  },
  {
    key: 'navigation',
    name: '导航',
    icons: [
      'mdi:menu',
      'mdi:menu-open',
      'mdi:apps',
      'mdi:view-dashboard',
      'mdi:view-dashboard-outline',
      'mdi:view-list',
      'mdi:view-list-outline',
      'mdi:view-grid',
      'mdi:view-grid-outline',
      'mdi:view-module',
      'mdi:view-module-outline',
      'mdi:arrow-left',
      'mdi:arrow-right',
      'mdi:arrow-up',
      'mdi:arrow-down',
      'mdi:arrow-left-circle',
      'mdi:arrow-right-circle',
      'mdi:arrow-up-circle',
      'mdi:arrow-down-circle',
      'mdi:chevron-left',
      'mdi:chevron-right',
      'mdi:chevron-up',
      'mdi:chevron-down',
      'mdi:chevron-double-left',
      'mdi:chevron-double-right',
      'mdi:chevron-double-up',
      'mdi:chevron-double-down',
      'mdi:unfold-more-horizontal',
      'mdi:unfold-less-horizontal',
      'mdi:unfold-more-vertical',
      'mdi:unfold-less-vertical',
      'mdi:dots-horizontal',
      'mdi:dots-vertical',
    ],
  },
  {
    key: 'edit',
    name: '编辑',
    icons: [
      'mdi:pencil',
      'mdi:pencil-outline',
      'mdi:pencil-box',
      'mdi:pencil-box-outline',
      'mdi:content-save',
      'mdi:content-save-outline',
      'mdi:content-copy',
      'mdi:content-cut',
      'mdi:content-paste',
      'mdi:undo',
      'mdi:undo-variant',
      'mdi:redo',
      'mdi:redo-variant',
      'mdi:format-bold',
      'mdi:format-italic',
      'mdi:format-underline',
      'mdi:format-strikethrough',
      'mdi:format-align-left',
      'mdi:format-align-center',
      'mdi:format-align-right',
      'mdi:format-align-justify',
      'mdi:format-list-bulleted',
      'mdi:format-list-numbered',
      'mdi:format-indent-increase',
      'mdi:format-indent-decrease',
      'mdi:format-quote-close',
      'mdi:format-color-text',
      'mdi:format-color-fill',
      'mdi:format-size',
      'mdi:link',
      'mdi:link-variant',
      'mdi:link-off',
    ],
  },
  {
    key: 'data',
    name: '数据',
    icons: [
      'mdi:chart-bar',
      'mdi:chart-line',
      'mdi:chart-pie',
      'mdi:chart-areaspline',
      'mdi:chart-donut',
      'mdi:chart-bubble',
      'mdi:chart-timeline',
      'mdi:chart-box',
      'mdi:chart-box-outline',
      'mdi:table',
      'mdi:table-large',
      'mdi:table-edit',
      'mdi:table-plus',
      'mdi:table-remove',
      'mdi:database',
      'mdi:database-outline',
      'mdi:database-plus',
      'mdi:database-minus',
      'mdi:server',
      'mdi:server-network',
      'mdi:server-security',
      'mdi:cloud',
      'mdi:cloud-outline',
      'mdi:cloud-upload',
      'mdi:cloud-download',
      'mdi:cloud-sync',
      'mdi:finance',
      'mdi:trending-up',
      'mdi:trending-down',
      'mdi:trending-neutral',
    ],
  },
  {
    key: 'user',
    name: '用户',
    icons: [
      'mdi:account',
      'mdi:account-outline',
      'mdi:account-circle',
      'mdi:account-circle-outline',
      'mdi:account-box',
      'mdi:account-box-outline',
      'mdi:account-group',
      'mdi:account-group-outline',
      'mdi:account-multiple',
      'mdi:account-multiple-outline',
      'mdi:account-plus',
      'mdi:account-plus-outline',
      'mdi:account-minus',
      'mdi:account-minus-outline',
      'mdi:account-check',
      'mdi:account-check-outline',
      'mdi:account-remove',
      'mdi:account-remove-outline',
      'mdi:account-edit',
      'mdi:account-edit-outline',
      'mdi:account-key',
      'mdi:account-key-outline',
      'mdi:account-lock',
      'mdi:account-lock-outline',
      'mdi:account-star',
      'mdi:account-star-outline',
      'mdi:badge-account',
      'mdi:badge-account-outline',
      'mdi:card-account-details',
      'mdi:card-account-details-outline',
    ],
  },
  {
    key: 'communication',
    name: '通讯',
    icons: [
      'mdi:email',
      'mdi:email-outline',
      'mdi:email-open',
      'mdi:email-open-outline',
      'mdi:email-send',
      'mdi:email-send-outline',
      'mdi:message',
      'mdi:message-outline',
      'mdi:message-text',
      'mdi:message-text-outline',
      'mdi:chat',
      'mdi:chat-outline',
      'mdi:comment',
      'mdi:comment-outline',
      'mdi:comment-text',
      'mdi:comment-text-outline',
      'mdi:phone',
      'mdi:phone-outline',
      'mdi:cellphone',
      'mdi:cellphone-basic',
      'mdi:video',
      'mdi:video-outline',
      'mdi:bell',
      'mdi:bell-outline',
      'mdi:bell-ring',
      'mdi:bell-ring-outline',
      'mdi:forum',
      'mdi:forum-outline',
      'mdi:at',
      'mdi:share',
      'mdi:share-variant',
      'mdi:share-outline',
    ],
  },
  {
    key: 'media',
    name: '媒体',
    icons: [
      'mdi:image',
      'mdi:image-outline',
      'mdi:image-multiple',
      'mdi:image-multiple-outline',
      'mdi:camera',
      'mdi:camera-outline',
      'mdi:video',
      'mdi:video-outline',
      'mdi:play',
      'mdi:play-outline',
      'mdi:play-circle',
      'mdi:play-circle-outline',
      'mdi:pause',
      'mdi:pause-outline',
      'mdi:pause-circle',
      'mdi:pause-circle-outline',
      'mdi:stop',
      'mdi:stop-outline',
      'mdi:stop-circle',
      'mdi:stop-circle-outline',
      'mdi:skip-next',
      'mdi:skip-next-outline',
      'mdi:skip-previous',
      'mdi:skip-previous-outline',
      'mdi:volume-high',
      'mdi:volume-medium',
      'mdi:volume-low',
      'mdi:volume-off',
      'mdi:music',
      'mdi:music-note',
      'mdi:music-box',
      'mdi:music-box-outline',
    ],
  },
  {
    key: 'device',
    name: '设备',
    icons: [
      'mdi:laptop',
      'mdi:monitor',
      'mdi:cellphone',
      'mdi:tablet',
      'mdi:watch',
      'mdi:printer',
      'mdi:printer-outline',
      'mdi:keyboard',
      'mdi:keyboard-outline',
      'mdi:mouse',
      'mdi:mouse-outline',
      'mdi:headphones',
      'mdi:headphones-box',
      'mdi:microphone',
      'mdi:microphone-outline',
      'mdi:webcam',
      'mdi:cast',
      'mdi:cast-connected',
      'mdi:bluetooth',
      'mdi:bluetooth-connect',
      'mdi:wifi',
      'mdi:wifi-strength-1',
      'mdi:wifi-strength-2',
      'mdi:wifi-strength-3',
      'mdi:wifi-strength-4',
      'mdi:wifi-off',
      'mdi:battery',
      'mdi:battery-charging',
      'mdi:battery-outline',
    ],
  },
];

// 当前分类的图标
const currentCategoryIcons = computed(() => {
  const category = iconCategories.find(c => c.key === activeTab.value);
  if (!category) return [];
  
  if (!searchKeyword.value.trim()) {
    return category.icons;
  }
  
  const keyword = searchKeyword.value.toLowerCase();
  return category.icons.filter(icon => icon.toLowerCase().includes(keyword));
});

// 选中的图标
const selectedIcon = computed({
  get: () => props.value,
  set: (value: string) => {
    emit('update:value', value);
  },
});

// 选择图标
function handleSelectIcon(icon: string) {
  selectedIcon.value = icon;
  showPopover.value = false;
  searchKeyword.value = '';
}

// 清空图标
function handleClear() {
  selectedIcon.value = '';
}

// 监听弹窗关闭，重置搜索
watch(showPopover, (val) => {
  if (!val) {
    searchKeyword.value = '';
    activeTab.value = 'common';
  }
});
</script>

<template>
  <NPopover
    v-model:show="showPopover"
    trigger="click"
    placement="bottom-start"
    :show-arrow="false"
    style="padding: 0"
  >
    <template #trigger>
      <div
        class="icon-picker-trigger"
        :class="{ 'has-value': selectedIcon }"
      >
        <IconifyIcon
          v-if="selectedIcon"
          :icon="selectedIcon"
          class="icon-preview"
        />
        <span v-else class="placeholder">{{ placeholder }}</span>
        <span
          v-if="selectedIcon"
          class="clear-btn"
          @click.stop="handleClear"
        >
          <IconifyIcon icon="mdi:close-circle" />
        </span>
      </div>
    </template>

    <div class="icon-picker-panel">
      <!-- 搜索框 -->
      <div class="search-box">
        <NInput
          v-model:value="searchKeyword"
          placeholder="搜索图标..."
          clearable
          size="small"
        >
          <template #prefix>
            <IconifyIcon icon="mdi:magnify" />
          </template>
        </NInput>
      </div>

      <!-- Tab 切换 -->
      <NTabs
        v-model:value="activeTab"
        type="line"
        size="small"
        animated
        class="icon-tabs"
      >
        <NTabPane
          v-for="category in iconCategories"
          :key="category.key"
          :name="category.key"
          :tab="category.name"
        >
          <div class="icon-grid-container">
            <div v-if="currentCategoryIcons.length > 0" class="icon-grid">
              <div
                v-for="icon in currentCategoryIcons"
                :key="icon"
                class="icon-item"
                :class="{ active: selectedIcon === icon }"
                :title="icon"
                @click="handleSelectIcon(icon)"
              >
                <IconifyIcon :icon="icon" />
              </div>
            </div>
            <NEmpty v-else description="未找到图标" size="small" class="empty-state" />
          </div>
        </NTabPane>
      </NTabs>
    </div>
  </NPopover>
</template>

<style scoped>
.icon-picker-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
  padding: 0 12px;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.82);
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.icon-picker-trigger:hover {
  background-color: rgba(255, 255, 255, 0.12);
  border-color: #36ad6a;
}

.icon-picker-trigger:focus-within {
  background-color: rgba(255, 255, 255, 0.12);
  border-color: #36ad6a;
  box-shadow: 0 0 0 2px rgba(54, 173, 106, 0.2);
}

.icon-picker-trigger.has-value {
  padding-right: 32px;
}

.icon-preview {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.82);
}

.placeholder {
  color: rgba(255, 255, 255, 0.38);
  font-size: 14px;
}

.clear-btn {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.38);
  cursor: pointer;
  transition: color 0.2s;
}

.clear-btn:hover {
  color: rgba(255, 255, 255, 0.82);
}

.icon-picker-panel {
  width: 520px;
  background-color: #18181c;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 3px;
  box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.32),
              0 3px 6px -4px rgba(0, 0, 0, 0.48),
              0 9px 28px 8px rgba(0, 0, 0, 0.2);
}

.search-box {
  padding: 12px 12px 8px;
}

.icon-tabs {
  padding: 0 12px;
}

.icon-tabs :deep(.n-tabs-nav) {
  padding-bottom: 8px;
}

.icon-tabs :deep(.n-tabs-tab) {
  padding: 8px 12px;
  color: rgba(255, 255, 255, 0.82);
}

.icon-tabs :deep(.n-tabs-tab:hover) {
  color: #36ad6a;
}

.icon-tabs :deep(.n-tabs-tab--active) {
  color: #36ad6a;
}

.icon-tabs :deep(.n-tabs-tab-pad) {
  border-color: rgba(255, 255, 255, 0.09);
}

.icon-tabs :deep(.n-tabs-bar) {
  background-color: #36ad6a;
}

.icon-grid-container {
  height: 320px;
  padding: 12px 0;
  overflow-y: auto;
}

.icon-grid-container::-webkit-scrollbar {
  width: 6px;
}

.icon-grid-container::-webkit-scrollbar-track {
  background-color: transparent;
}

.icon-grid-container::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.icon-grid-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.25);
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
  padding: 0 12px;
}

.icon-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  font-size: 22px;
  color: rgba(255, 255, 255, 0.82);
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.icon-item:hover {
  border-color: #36ad6a;
  background-color: rgba(54, 173, 106, 0.15);
  color: #36ad6a;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(54, 173, 106, 0.25);
}

.icon-item.active {
  border-color: #36ad6a;
  background-color: rgba(54, 173, 106, 0.15);
  color: #36ad6a;
  box-shadow: 0 0 0 2px rgba(54, 173, 106, 0.2);
}

.icon-item.active::after {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  background-color: #36ad6a;
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(54, 173, 106, 0.6);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.38);
}
</style>
