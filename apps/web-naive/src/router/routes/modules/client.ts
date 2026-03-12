import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:monitor-smartphone',
      order: 12,
      title: $t('page.client.title'),
    },
    name: 'Client',
    path: '/client',
    redirect: '/client/module',
    children: [
      {
        name: 'ClientModule',
        path: 'module',
        component: () => import('#/views/client/module/index.vue'),
        meta: {
          icon: 'lucide:layers',
          title: $t('page.client.module'),
        },
      },
      {
        name: 'ClientMenu',
        path: 'menu',
        component: () => import('#/views/client/menu/index.vue'),
        meta: {
          icon: 'lucide:menu',
          title: $t('page.client.menu'),
        },
      },
    ],
  },
];

export default routes;
