<script setup lang="ts">
/**
 * 爬虫任务弹窗组件
 *
 * 支持 create/edit 两种模式。
 * 所有爬虫类型都支持原始 JSON 配置。
 * 针对 generic / github_trending / github_repo 额外提供结构化配置表单作为辅助。
 * 优先级：原始 JSON 配置 > 结构化配置
 */

import type { FormInst, FormRules, SelectOption } from 'naive-ui';
import type { CrawlerApi } from '#/api/modules/crawler';

import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NSwitch,
  NCard,
  NCode,
  NTabs,
  NTabPane,
  NSteps,
  NStep,
  NDivider,
} from 'naive-ui';

import { message } from '#/adapter/naive';
import { getSpidersApi } from '#/api/modules/crawler';

import GenericConfig from './taskConfig/GenericConfig.vue';
import GithubTrendingConfig from './taskConfig/GithubTrendingConfig.vue';
import GithubRepoConfig from './taskConfig/GithubRepoConfig.vue';
import ConfigParamsDocs from './ConfigParamsDocs.vue';

defineOptions({ name: 'TaskModal' });

const props = withDefaults(defineProps<Props>(), {
  initialValues: () => ({}),
});

const emit = defineEmits<Emits>();

interface Props {
  initialValues?: Partial<CrawlerApi.CrawlTask>;
  mode: 'create' | 'edit';
}

interface Emits {
  (
    e: 'submit',
    values: CrawlerApi.CreateTaskParams | CrawlerApi.UpdateTaskParams,
  ): void;
}

// ==================== 表单数据 ====================

const show = defineModel<boolean>('show', { required: true });
const formRef = ref<FormInst | null>(null);
const showExampleModal = ref(false);
const jsonError = ref('');
const currentStep = ref(1);

const formModel = reactive({
  name: '',
  spiderName: null as null | string,
  targetUrl: '',
  enabled: true,
  configJson: '',
});

// 结构化配置
const genericConfig = ref({
  maxLinks: 50,
  maxImages: 50,
  extractContent: true,
  extractLinks: true,
  extractImages: true,
});

const trendingConfig = ref({
  keywords: [] as string[],
  language: '',
  sort: 'stars' as string,
  minStars: 100,
  maxPages: 3,
  perPage: 30,
  fetchReadme: false,
  fetchReadmeLimit: 10,
  fetchVersion: true,
  token: '',
});

const repoConfig = ref({
  githubToken: '',
  maxContributors: 10,
  maxCommits: 10,
});

// ==================== 步骤控制 ====================

const canGoNext = computed(() => {
  switch (currentStep.value) {
    case 1:
      return formModel.name.trim() && formModel.spiderName;
    case 2:
      return formModel.targetUrl.trim();
    case 3:
      return true; // 配置步骤是可选的
    default:
      return true;
  }
});

function nextStep() {
  if (canGoNext.value && currentStep.value < 3) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

function resetStep() {
  currentStep.value = 1;
}

// ==================== 配置示例 ====================

const configExamples = computed(() => {
  const examples: Record<string, { basic: string; advanced: string; description: string }> = {
    generic: {
      description: '通用网页爬虫 - 提取页面内容、链接和图片',
      basic: JSON.stringify({
        maxLinks: 50,
        maxImages: 50,
        extractContent: true,
        extractLinks: true,
        extractImages: true,
      }, null, 2),
      advanced: JSON.stringify({
        maxLinks: 100,
        maxImages: 20,
        extractContent: true,
        extractLinks: false,
        extractImages: true,
        timeout: 60,
        delay: 2.0,
        proxy: 'http://proxy.example.com:8080',
      }, null, 2),
    },
    github_trending: {
      description: 'GitHub 趋势项目爬虫 - 搜索热门开源项目',
      basic: JSON.stringify({
        keywords: ['ai', 'machine learning'],
        language: 'Python',
        sort: 'stars',
        minStars: 100,
        maxPages: 3,
        perPage: 30,
      }, null, 2),
      advanced: JSON.stringify({
        keywords: ['vue', 'react', 'angular'],
        language: 'TypeScript',
        sort: 'stars',
        minStars: 500,
        maxPages: 5,
        perPage: 50,
        fetchReadme: true,
        fetchReadmeLimit: 20,
        fetchVersion: true,
        token: 'ghp_your_github_token_here',
        delay: 1.5,
      }, null, 2),
    },
    github_repo: {
      description: 'GitHub 仓库详情爬虫 - 获取仓库完整信息',
      basic: JSON.stringify({
        githubToken: 'ghp_your_github_token_here',
        maxContributors: 10,
        maxCommits: 10,
      }, null, 2),
      advanced: JSON.stringify({
        githubToken: 'ghp_your_github_token_here',
        maxContributors: 20,
        maxCommits: 50,
        timeout: 45,
        delay: 1.0,
      }, null, 2),
    },
  };

  return examples;
});

const currentExample = computed(() => {
  if (!formModel.spiderName) return null;
  return configExamples.value[formModel.spiderName] || null;
});

// ==================== 配置示例方法 ====================

function showConfigExample() {
  if (!formModel.spiderName) {
    message.warning('请先选择爬虫类型');
    return;
  }
  showExampleModal.value = true;
}

function useExample(type: 'basic' | 'advanced') {
  if (!currentExample.value) return;
  formModel.configJson = currentExample.value[type];
  showExampleModal.value = false;
  message.success(`已应用${type === 'basic' ? '基础' : '高级'}配置示例`);
}

function getSpiderDescription(spiderName: string): string {
  const descriptions: Record<string, string> = {
    generic: '🌐 通用网页爬虫 - 适用于大多数网站，提取标题、内容、链接和图片',
    github_trending: '🔥 GitHub 趋势爬虫 - 搜索 GitHub 热门项目，支持关键词、语言过滤',
    github_repo: '📦 GitHub 仓库爬虫 - 获取指定仓库的详细信息，包括贡献者、提交记录等',
  };
  return descriptions[spiderName] || '';
}

function getUrlPlaceholder(): string {
  if (!formModel.spiderName) return 'https://example.com';
  
  const placeholders: Record<string, string> = {
    generic: 'https://example.com - 任何网站 URL',
    github_trending: 'https://github.com/search?q=ai&type=repositories - GitHub 搜索页面',
    github_repo: 'https://github.com/owner/repo - 具体的 GitHub 仓库地址',
  };
  
  return placeholders[formModel.spiderName] || 'https://example.com';
}

function getUrlHint(): string {
  if (!formModel.spiderName) return '';
  
  const hints: Record<string, string> = {
    generic: '支持任何 HTTP/HTTPS 网站，爬虫会自动提取页面内容',
    github_trending: '可以是 GitHub 搜索结果页面，或直接输入关键词让爬虫自动搜索',
    github_repo: '必须是具体的 GitHub 仓库地址，格式：https://github.com/用户名/仓库名',
  };
  
  return hints[formModel.spiderName] || '';
}



function validateJson() {
  jsonError.value = '';
  if (!formModel.configJson.trim()) return;

  try {
    const parsed = JSON.parse(formModel.configJson.trim());
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      jsonError.value = '配置必须为 JSON 对象';
    }
  } catch (error) {
    jsonError.value = 'JSON 格式无效';
  }
}

function formatJson() {
  if (!formModel.configJson.trim()) return;

  try {
    const parsed = JSON.parse(formModel.configJson.trim());
    formModel.configJson = JSON.stringify(parsed, null, 2);
    jsonError.value = '';
    message.success('JSON 格式化成功');
  } catch (error) {
    message.error('JSON 格式无效，无法格式化');
  }
}

const title = computed(() =>
  props.mode === 'create' ? '新增任务' : '编辑任务',
);

const isGeneric = computed(() => formModel.spiderName === 'generic');
const isGithubTrending = computed(
  () => formModel.spiderName === 'github_trending',
);
const isGithubRepo = computed(() => formModel.spiderName === 'github_repo');
const hasStructuredConfig = computed(
  () => isGeneric.value || isGithubTrending.value || isGithubRepo.value,
);

// ==================== 爬虫选项数据 ====================

const spiderOptions = ref<SelectOption[]>([]);
const loadingSpiders = ref(false);

async function fetchSpiders() {
  loadingSpiders.value = true;
  try {
    const spiders = await getSpidersApi();
    spiderOptions.value = spiders
      .map((s: CrawlerApi.Spider) => ({
        label: `${s.name} - ${s.doc || s.class}`,
        value: s.name,
      }));
  } catch (error) {
    console.error('Failed to fetch spiders:', error);
  } finally {
    loadingSpiders.value = false;
  }
}

onMounted(() => {
  // 移除自动调用爬虫接口，改为在弹窗显示时调用
  // fetchSpiders();
});

// 监听弹窗显示状态，在显示时加载爬虫列表
watch(() => show.value, (newShow) => {
  if (newShow) {
    fetchSpiders();
  }
});

// ==================== 表单验证 ====================

const rules = computed((): FormRules => {
  return {
    name: [
      {
        required: true,
        message: '请输入任务名称',
        trigger: ['input', 'blur'],
      },
    ],
    spiderName: [
      {
        required: props.mode === 'create',
        message: '请选择爬虫类型',
        trigger: ['change', 'blur'],
      },
    ],
    targetUrl: [
      {
        required: true,
        message: '请输入目标 URL',
        trigger: ['input', 'blur'],
      },
      {
        validator(_rule: unknown, value: string) {
          if (!value) return true;
          if (!value.startsWith('http://') && !value.startsWith('https://')) {
            return new Error('URL 必须以 http:// 或 https:// 开头');
          }
          return true;
        },
        trigger: ['input', 'blur'],
      },
    ],
  };
});

// ==================== 配置解析和构建 ====================

function parseGenericConfigFromJson(config: Record<string, any>) {
  genericConfig.value = {
    maxLinks: config.maxLinks ?? 50,
    maxImages: config.maxImages ?? 50,
    extractContent: config.extractContent ?? true,
    extractLinks: config.extractLinks ?? true,
    extractImages: config.extractImages ?? true,
  };
}

function parseTrendingConfigFromJson(config: Record<string, any>) {
  const raw = config.keywords || config.keyword || '';
  let keywords: string[] = [];
  if (Array.isArray(raw)) {
    keywords = raw;
  } else if (typeof raw === 'string' && raw) {
    keywords = raw
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  trendingConfig.value = {
    keywords,
    language: config.language || '',
    sort: config.sort || 'stars',
    minStars: config.minStars ?? 100,
    maxPages: config.maxPages ?? 3,
    perPage: config.perPage ?? 30,
    fetchReadme: config.fetchReadme ?? false,
    fetchReadmeLimit: config.fetchReadmeLimit ?? 10,
    fetchVersion: config.fetchVersion ?? true,
    token: config.token || '',
  };
}

function parseRepoConfigFromJson(config: Record<string, any>) {
  repoConfig.value = {
    githubToken: config.githubToken || '',
    maxContributors: config.maxContributors ?? 10,
    maxCommits: config.maxCommits ?? 10,
  };
}

function buildGenericConfig(): Record<string, any> {
  const cfg: Record<string, any> = {};
  const gc = genericConfig.value;
  if (gc.maxLinks !== 50) cfg.maxLinks = gc.maxLinks;
  if (gc.maxImages !== 50) cfg.maxImages = gc.maxImages;
  if (!gc.extractContent) cfg.extractContent = false;
  if (!gc.extractLinks) cfg.extractLinks = false;
  if (!gc.extractImages) cfg.extractImages = false;
  return cfg;
}

function buildTrendingConfig(): Record<string, any> {
  const cfg: Record<string, any> = {};
  const tc = trendingConfig.value;
  if (tc.keywords.length > 0) cfg.keywords = tc.keywords;
  if (tc.language) cfg.language = tc.language;
  if (tc.sort !== 'stars') cfg.sort = tc.sort;
  if (tc.minStars !== 100) cfg.minStars = tc.minStars;
  if (tc.maxPages !== 3) cfg.maxPages = tc.maxPages;
  if (tc.perPage !== 30) cfg.perPage = tc.perPage;
  if (tc.fetchReadme) cfg.fetchReadme = true;
  if (tc.fetchReadmeLimit !== 10) cfg.fetchReadmeLimit = tc.fetchReadmeLimit;
  if (!tc.fetchVersion) cfg.fetchVersion = false;
  if (tc.token) cfg.token = tc.token;
  return cfg;
}

function buildRepoConfig(): Record<string, any> {
  const cfg: Record<string, any> = {};
  const rc = repoConfig.value;
  if (rc.githubToken) cfg.githubToken = rc.githubToken;
  if (rc.maxContributors !== 10) cfg.maxContributors = rc.maxContributors;
  if (rc.maxCommits !== 10) cfg.maxCommits = rc.maxCommits;
  return cfg;
}

// ==================== 表单数据管理 ====================

function resetStructuredConfig() {
  genericConfig.value = {
    maxLinks: 50,
    maxImages: 50,
    extractContent: true,
    extractLinks: true,
    extractImages: true,
  };

  trendingConfig.value = {
    keywords: [],
    language: '',
    sort: 'stars',
    minStars: 100,
    maxPages: 3,
    perPage: 30,
    fetchReadme: false,
    fetchReadmeLimit: 10,
    fetchVersion: true,
    token: '',
  };

  repoConfig.value = {
    githubToken: '',
    maxContributors: 10,
    maxCommits: 10,
  };
}

function applyInitialValues() {
  const iv = props.initialValues;
  formModel.name = iv?.name ?? '';
  formModel.spiderName = iv?.spiderName ?? null;
  formModel.targetUrl = iv?.targetUrl ?? '';
  formModel.enabled = iv?.enabled ?? true;
  formModel.configJson = iv?.config ? JSON.stringify(iv.config, null, 2) : '';

  // 清除 JSON 错误
  jsonError.value = '';

  resetStructuredConfig();
  if (iv?.config) {
    if (iv.spiderName === 'generic') {
      parseGenericConfigFromJson(iv.config);
    } else if (iv.spiderName === 'github_trending') {
      parseTrendingConfigFromJson(iv.config);
    } else if (iv.spiderName === 'github_repo') {
      parseRepoConfigFromJson(iv.config);
    }
  }
}

watch(
  () => show.value,
  (val: boolean) => {
    if (!val) return;
    applyInitialValues();
    formRef.value?.restoreValidation();
    resetStep();
  },
);

watch(
  () => props.initialValues,
  () => {
    if (show.value) {
      applyInitialValues();
      formRef.value?.restoreValidation();
    }
  },
  { deep: true },
);

// ==================== 表单提交 ====================

async function handleSubmit() {
  const form = formRef.value;
  if (!form) return;

  await form.validate();

  let config: Record<string, any> | undefined;
  
  // 优先使用原始 JSON 配置
  if (formModel.configJson.trim()) {
    try {
      config = JSON.parse(formModel.configJson.trim());
      if (
        typeof config !== 'object' ||
        Array.isArray(config) ||
        config === null
      ) {
        message.error('配置必须为 JSON 对象');
        return;
      }
    } catch {
      message.error('配置 JSON 格式无效');
      return;
    }
  }
  // 如果没有 JSON 配置，且是结构化爬虫类型，则使用结构化配置
  else if (hasStructuredConfig.value) {
    if (isGeneric.value) {
      config = buildGenericConfig();
    } else if (isGithubTrending.value) {
      config = buildTrendingConfig();
    } else if (isGithubRepo.value) {
      config = buildRepoConfig();
    }
    if (config && Object.keys(config).length === 0) {
      config = undefined;
    }
  }

  if (props.mode === 'create') {
    const submitData: CrawlerApi.CreateTaskParams = {
      name: formModel.name.trim(),
      spiderName: formModel.spiderName!,
      targetUrl: formModel.targetUrl.trim(),
      config,
      enabled: formModel.enabled,
    };
    emit('submit', submitData);
  } else {
    const submitData: CrawlerApi.UpdateTaskParams = {
      name: formModel.name.trim(),
      targetUrl: formModel.targetUrl.trim(),
      config,
      enabled: formModel.enabled,
    };
    emit('submit', submitData);
  }
}
</script>

<template>
  <NModal v-model:show="show" preset="card" :title="title" class="w-[700px]">
    <!-- 步骤指示器 -->
    <div v-if="mode === 'create'" class="mb-6">
      <NSteps :current="currentStep" size="small">
        <NStep title="基础信息" description="任务名称和爬虫类型" />
        <NStep title="目标配置" description="URL 和运行设置" />
        <NStep title="高级配置" description="参数配置（可选）" />
      </NSteps>
    </div>

    <NForm
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-placement="top"
    >
      <!-- 步骤 1: 基础信息 -->
      <div v-show="currentStep === 1 || mode === 'edit'">
        <NCard title="📝 基础信息" size="small" class="mb-4" v-if="mode === 'create'">
          <template #header-extra>
            <span class="text-sm text-gray-500">第 1 步</span>
          </template>
          
          <div class="space-y-4">
            <NFormItem label="任务名称" path="name">
              <NInput 
                v-model:value="formModel.name" 
                placeholder="为你的爬虫任务起个名字，如：AI 项目收集"
                size="large"
              />
            </NFormItem>

            <NFormItem label="爬虫类型" path="spiderName">
              <div class="w-full">
                <NSelect
                  v-model:value="formModel.spiderName"
                  :options="spiderOptions"
                  :loading="loadingSpiders"
                  :disabled="mode !== 'create'"
                  placeholder="选择适合的爬虫类型"
                  size="large"
                />
                <div v-if="formModel.spiderName" class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div class="text-sm text-blue-800 dark:text-blue-200">
                    {{ getSpiderDescription(formModel.spiderName) }}
                  </div>
                </div>
              </div>
            </NFormItem>
          </div>
        </NCard>

        <!-- 编辑模式的基础信息 -->
        <div v-else class="space-y-4">
          <NFormItem label="任务名称" path="name">
            <NInput v-model:value="formModel.name" placeholder="请输入任务名称" />
          </NFormItem>

          <NFormItem label="爬虫类型" path="spiderName">
            <div class="w-full">
              <NSelect
                v-model:value="formModel.spiderName"
                :options="spiderOptions"
                :loading="loadingSpiders"
                disabled
                placeholder="请选择爬虫类型"
              />
              <div v-if="formModel.spiderName" class="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-600 dark:text-gray-300">
                {{ getSpiderDescription(formModel.spiderName) }}
              </div>
            </div>
          </NFormItem>
        </div>
      </div>

      <!-- 步骤 2: 目标配置 -->
      <div v-show="currentStep === 2 || mode === 'edit'">
        <NCard title="🎯 目标配置" size="small" class="mb-4" v-if="mode === 'create'">
          <template #header-extra>
            <span class="text-sm text-gray-500">第 2 步</span>
          </template>
          
          <div class="space-y-4">
            <NFormItem label="目标 URL" path="targetUrl">
              <NInput
                v-model:value="formModel.targetUrl"
                :placeholder="getUrlPlaceholder()"
                size="large"
              />
              <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {{ getUrlHint() }}
              </div>
            </NFormItem>

            <NFormItem label="启用状态">
              <div class="flex items-center space-x-3">
                <NSwitch v-model:value="formModel.enabled" size="large" />
                <span class="text-sm text-gray-600 dark:text-gray-300">
                  {{ formModel.enabled ? '任务创建后立即可用' : '任务创建后暂停，需手动启用' }}
                </span>
              </div>
            </NFormItem>
          </div>
        </NCard>

        <!-- 编辑模式的目标配置 -->
        <div v-else class="space-y-4">
          <NFormItem label="目标 URL" path="targetUrl">
            <NInput
              v-model:value="formModel.targetUrl"
              :placeholder="
                isGithubRepo
                  ? 'https://github.com/owner/repo'
                  : 'https://example.com'
              "
            />
          </NFormItem>

          <NFormItem label="启用状态" path="enabled">
            <NSwitch v-model:value="formModel.enabled" />
          </NFormItem>
        </div>
      </div>

      <!-- 步骤 3: 高级配置 -->
      <div v-show="currentStep === 3 || mode === 'edit'">
        <NCard title="⚙️ 高级配置" size="small" class="mb-4" v-if="mode === 'create'">
          <template #header-extra>
            <span class="text-sm text-gray-500">第 3 步（可选）</span>
          </template>
          
          <div class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            根据需要配置爬虫参数，也可以跳过此步骤使用默认设置。
          </div>

          <!-- 结构化配置 -->
          <div v-if="hasStructuredConfig">
            <NDivider title-placement="left">
              <span class="text-sm">结构化配置</span>
            </NDivider>
            
            <template v-if="isGeneric">
              <GenericConfig v-model:config="genericConfig" />
            </template>

            <template v-else-if="isGithubTrending">
              <GithubTrendingConfig v-model:config="trendingConfig" />
            </template>

            <template v-else-if="isGithubRepo">
              <GithubRepoConfig v-model:config="repoConfig" />
            </template>
          </div>

          <!-- JSON 配置 -->
          <div v-if="formModel.spiderName">
            <NDivider title-placement="left">
              <span class="text-sm">JSON 配置</span>
            </NDivider>
            
            <NFormItem path="configJson">
              <div class="w-full">
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    高级用户可直接编写 JSON 配置（优先级高于结构化配置）
                  </span>
                  <div class="flex gap-2">
                    <NButton
                      size="tiny"
                      @click="formatJson"
                      :disabled="!formModel.configJson.trim()"
                    >
                      格式化
                    </NButton>
                    <NButton
                      size="tiny"
                      type="primary"
                      quaternary
                      @click="showConfigExample"
                    >
                      查看示例
                    </NButton>
                  </div>
                </div>
                <NInput
                  v-model:value="formModel.configJson"
                  type="textarea"
                  :rows="6"
                  placeholder="请输入 JSON 配置，如：&#10;{&#10;  &quot;timeout&quot;: 30,&#10;  &quot;delay&quot;: 1.0&#10;}"
                  @blur="validateJson"
                />
                <div v-if="jsonError" class="mt-1 text-xs text-red-500 dark:text-red-400">
                  {{ jsonError }}
                </div>
                <div v-else-if="formModel.configJson.trim()" class="mt-1 text-xs text-green-600 dark:text-green-400">
                  ✓ JSON 格式正确
                </div>
              </div>
            </NFormItem>
          </div>
        </NCard>

        <!-- 编辑模式的配置 -->
        <div v-else>
          <!-- 结构化配置 -->
          <template v-if="isGeneric">
            <GenericConfig v-model:config="genericConfig" />
          </template>

          <template v-else-if="isGithubTrending">
            <GithubTrendingConfig v-model:config="trendingConfig" />
          </template>

          <template v-else-if="isGithubRepo">
            <GithubRepoConfig v-model:config="repoConfig" />
          </template>

          <!-- 原始 JSON 配置 -->
          <template v-if="formModel.spiderName">
            <NFormItem label="配置 JSON" path="configJson">
              <div class="w-full">
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    可选，输入 JSON 对象格式配置（优先级高于结构化配置）
                  </span>
                  <div class="flex gap-2">
                    <NButton
                      size="tiny"
                      @click="formatJson"
                      :disabled="!formModel.configJson.trim()"
                    >
                      格式化
                    </NButton>
                    <NButton
                      size="tiny"
                      type="primary"
                      quaternary
                      @click="showConfigExample"
                    >
                      查看示例
                    </NButton>
                  </div>
                </div>
                <NInput
                  v-model:value="formModel.configJson"
                  type="textarea"
                  :rows="6"
                  placeholder="请输入 JSON 配置，如：&#10;{&#10;  &quot;timeout&quot;: 30,&#10;  &quot;delay&quot;: 1.0&#10;}"
                  @blur="validateJson"
                />
                <div v-if="jsonError" class="mt-1 text-xs text-red-500 dark:text-red-400">
                  {{ jsonError }}
                </div>
                <div v-else-if="formModel.configJson.trim()" class="mt-1 text-xs text-green-600 dark:text-green-400">
                  ✓ JSON 格式正确
                </div>
              </div>
            </NFormItem>
          </template>
        </div>
      </div>
    </NForm>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="flex justify-between">
        <!-- 创建模式的步骤按钮 -->
        <div v-if="mode === 'create'" class="flex gap-3">
          <NButton 
            v-if="currentStep > 1" 
            @click="prevStep"
          >
            上一步
          </NButton>
          <div v-else></div>
        </div>
        <div v-else></div>

        <div class="flex gap-3">
          <NButton tertiary @click="show = false">取消</NButton>
          
          <!-- 创建模式 -->
          <template v-if="mode === 'create'">
            <NButton 
              v-if="currentStep < 3" 
              type="primary" 
              @click="nextStep"
              :disabled="!canGoNext"
            >
              下一步
            </NButton>
            <NButton 
              v-else 
              type="primary" 
              @click="handleSubmit"
            >
              创建任务
            </NButton>
          </template>
          
          <!-- 编辑模式 -->
          <NButton 
            v-else 
            type="primary" 
            @click="handleSubmit"
          >
            保存
          </NButton>
        </div>
      </div>
    </template>
  </NModal>

  <!-- 配置示例弹窗 -->
  <NModal
    v-model:show="showExampleModal"
    preset="card"
    title="JSON 配置示例"
    class="w-[800px]"
  >
    <div v-if="currentExample">
      <div class="mb-4">
        <h4 class="text-base font-medium mb-2">{{ currentExample.description }}</h4>
        <p class="text-sm text-gray-500">
          选择一个示例配置快速开始，你可以根据需要修改参数值。
        </p>
      </div>

      <NTabs type="line" animated>
        <NTabPane name="basic" tab="基础配置">
          <div class="space-y-4">
            <div class="text-sm text-gray-600 mb-2">
              包含最常用的配置参数，适合大多数使用场景。
            </div>
            <NCard size="small">
              <NCode :code="currentExample.basic" language="json" />
            </NCard>
            <div class="flex justify-end">
              <NButton type="primary" @click="useExample('basic')">
                使用此配置
              </NButton>
            </div>
          </div>
        </NTabPane>

        <NTabPane name="advanced" tab="高级配置">
          <div class="space-y-4">
            <div class="text-sm text-gray-600 mb-2">
              包含更多高级参数，如网络配置、代理设置等。
            </div>
            <NCard size="small">
              <NCode :code="currentExample.advanced" language="json" />
            </NCard>
            <div class="flex justify-end">
              <NButton type="primary" @click="useExample('advanced')">
                使用此配置
              </NButton>
            </div>
          </div>
        </NTabPane>

        <NTabPane name="params" tab="参数说明">
          <div class="space-y-4">
            <ConfigParamsDocs :spider-name="formModel.spiderName" />
          </div>
        </NTabPane>
      </NTabs>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <NButton @click="showExampleModal = false">关闭</NButton>
      </div>
    </template>
  </NModal>
</template>
