<script setup lang="ts">
import { computed, h } from 'vue';
import { NTable, NTag } from 'naive-ui';

interface Props {
  spiderName: string | null;
}

const props = defineProps<Props>();

interface ParamDoc {
  name: string;
  type: string;
  default: string;
  description: string;
  required?: boolean;
}

const paramDocs = computed(() => {
  const docs: Record<string, ParamDoc[]> = {
    generic: [
      {
        name: 'maxLinks',
        type: 'number',
        default: '50',
        description: '最大提取链接数量',
      },
      {
        name: 'maxImages',
        type: 'number',
        default: '50',
        description: '最大提取图片数量',
      },
      {
        name: 'extractContent',
        type: 'boolean',
        default: 'true',
        description: '是否提取页面内容',
      },
      {
        name: 'extractLinks',
        type: 'boolean',
        default: 'true',
        description: '是否提取页面链接',
      },
      {
        name: 'extractImages',
        type: 'boolean',
        default: 'true',
        description: '是否提取页面图片',
      },
    ],
    github_trending: [
      {
        name: 'keywords',
        type: 'array|string',
        default: '["ai"]',
        description: '搜索关键词，支持数组或逗号分隔字符串',
        required: true,
      },
      {
        name: 'language',
        type: 'string',
        default: '""',
        description: '编程语言过滤，如 "Python", "JavaScript"',
      },
      {
        name: 'sort',
        type: 'string',
        default: '"stars"',
        description: '排序方式：stars, forks, updated, best-match',
      },
      {
        name: 'minStars',
        type: 'number',
        default: '100',
        description: '最低星标数',
      },
      {
        name: 'maxPages',
        type: 'number',
        default: '3',
        description: '搜索页数，最大 34',
      },
      {
        name: 'perPage',
        type: 'number',
        default: '30',
        description: '每页结果数，范围 10-100',
      },
      {
        name: 'fetchReadme',
        type: 'boolean',
        default: 'false',
        description: '是否抓取 README',
      },
      {
        name: 'fetchReadmeLimit',
        type: 'number',
        default: '10',
        description: 'README 抓取数量限制',
      },
      {
        name: 'fetchVersion',
        type: 'boolean',
        default: 'true',
        description: '是否抓取版本号',
      },
      {
        name: 'token',
        type: 'string',
        default: '""',
        description: 'GitHub Token，提高 API 限制（30/min vs 10/min）',
      },
    ],
    github_repo: [
      {
        name: 'githubToken',
        type: 'string',
        default: '""',
        description: 'GitHub Token，提高 API 限制',
      },
      {
        name: 'maxContributors',
        type: 'number',
        default: '10',
        description: '最大贡献者数量',
      },
      {
        name: 'maxCommits',
        type: 'number',
        default: '10',
        description: '最大提交记录数',
      },
    ],
  };

  // 通用配置参数
  const commonParams: ParamDoc[] = [
    {
      name: 'timeout',
      type: 'number',
      default: '30',
      description: '请求超时时间（秒）',
    },
    {
      name: 'retry',
      type: 'number',
      default: '3',
      description: '重试次数',
    },
    {
      name: 'delay',
      type: 'number',
      default: '1.0',
      description: '请求间隔（秒）',
    },
    {
      name: 'proxy',
      type: 'string',
      default: '""',
      description: '代理地址，如 "http://proxy.example.com:8080"',
    },
    {
      name: 'proxyList',
      type: 'array',
      default: '[]',
      description: '代理地址列表，支持轮换使用',
    },
  ];

  if (!props.spiderName || !docs[props.spiderName]) {
    return commonParams;
  }

  const spiderParams = docs[props.spiderName] || [];
  return [...spiderParams, ...commonParams];
});

const columns = [
  {
    title: '参数名',
    key: 'name',
    width: 150,
    render: (row: ParamDoc) => {
      return [
        row.name,
        row.required ? ' *' : '',
      ].join('');
    },
  },
  {
    title: '类型',
    key: 'type',
    width: 120,
    render: (row: ParamDoc) => {
      const colors: Record<string, 'default' | 'error' | 'primary' | 'success' | 'info' | 'warning'> = {
        string: 'success',
        number: 'info',
        boolean: 'warning',
        array: 'error',
        'array|string': 'default',
      };
      return h(NTag, { 
        size: 'small', 
        type: colors[row.type] || 'default' 
      }, { default: () => row.type });
    },
  },
  {
    title: '默认值',
    key: 'default',
    width: 100,
    render: (row: ParamDoc) => {
      return h('code', { 
        style: { 
          fontSize: '12px', 
          padding: '2px 4px', 
          borderRadius: '2px' 
        },
        class: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      }, row.default);
    },
  },
  {
    title: '说明',
    key: 'description',
    render: (row: ParamDoc) => row.description,
  },
];
</script>

<template>
  <div>
    <div class="mb-4">
      <h4 class="text-base font-medium mb-2">配置参数说明</h4>
      <p class="text-sm text-gray-500">
        所有参数都是可选的，爬虫会使用合理的默认值。标有 * 的参数在某些场景下是必需的。
      </p>
    </div>

    <NTable :columns="columns" :data="paramDocs" size="small" />

    <div class="mt-4 space-y-3">
      <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h5 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">💡 使用提示</h5>
        <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>GitHub Token</strong>: 强烈建议配置，可显著提高 API 限制</li>
          <li>• <strong>代理配置</strong>: 支持 HTTP/HTTPS 代理，可配置单个或多个轮换</li>
          <li>• <strong>延迟设置</strong>: 建议根据目标网站调整 delay 参数，避免被限流</li>
          <li>• <strong>数量限制</strong>: GitHub 相关爬虫建议合理设置数量限制，避免超出 API 配额</li>
        </ul>
      </div>

      <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h5 class="text-sm font-medium text-green-800 dark:text-green-200 mb-2">📝 配置示例</h5>
        <div class="text-sm text-green-700 dark:text-green-300 space-y-1">
          <div><strong>通用网络配置</strong>: <code class="bg-green-100 dark:bg-green-800/50 px-1 rounded">{"timeout": 60, "delay": 2.0}</code></div>
          <div><strong>代理配置</strong>: <code class="bg-green-100 dark:bg-green-800/50 px-1 rounded">{"proxy": "http://proxy.example.com:8080"}</code></div>
          <div><strong>多代理轮换</strong>: <code class="bg-green-100 dark:bg-green-800/50 px-1 rounded">{"proxyList": ["http://proxy1.com:8080", "http://proxy2.com:8080"]}</code></div>
        </div>
      </div>

      <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h5 class="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">⚠️ 注意事项</h5>
        <ul class="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>• 所有配置参数都是可选的，爬虫会使用合理的默认值</li>
          <li>• JSON 配置优先级高于结构化表单配置</li>
          <li>• 建议先使用结构化表单，需要高级配置时再使用 JSON</li>
          <li>• 配置错误可能导致爬虫运行失败，请仔细检查参数值</li>
        </ul>
      </div>
    </div>
  </div>
</template>
