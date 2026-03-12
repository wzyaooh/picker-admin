import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:wrench',
      order: 13,
      title: $t('page.systemTools.title'),
    },
    name: 'SystemTools',
    path: '/system-tools',
    redirect: '/system-tools/dict',
    children: [
      {
        name: 'SystemToolsDict',
        path: 'dict',
        component: () => import('#/views/system-tools/dict/index.vue'),
        meta: {
          icon: 'lucide:book-open',
          title: $t('page.systemTools.dict'),
        },
      },
      {
        name: 'SystemToolsFile',
        path: 'file',
        component: () => import('#/views/system-tools/file/index.vue'),
        meta: {
          icon: 'lucide:folder',
          title: $t('page.systemTools.file'),
        },
      },
      {
        name: 'SystemToolsAudit',
        path: 'audit',
        component: () => import('#/views/system-tools/audit/index.vue'),
        meta: {
          icon: 'lucide:file-text',
          title: $t('page.systemTools.audit'),
        },
      },
      {
        name: 'SystemToolsApiKey',
        path: 'api-key',
        component: () => import('#/views/system-tools/api-key/index.vue'),
        meta: {
          icon: 'lucide:key',
          title: $t('page.systemTools.apiKey'),
        },
      },
      {
        name: 'SystemToolsConfig',
        path: 'config',
        component: () => import('#/views/system-tools/config/index.vue'),
        meta: {
          icon: 'lucide:settings',
          title: $t('page.systemTools.config'),
        },
      },
    ],
  },
];

export default routes;
