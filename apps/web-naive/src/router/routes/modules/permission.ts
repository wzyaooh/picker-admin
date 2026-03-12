import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:shield-check',
      order: 10,
      title: $t('page.permission.title'),
    },
    name: 'Permission',
    path: '/permission',
    redirect: '/permission/module',
    children: [
      {
        name: 'PermissionModule',
        path: 'module',
        component: () => import('#/views/permission/module/index.vue'),
        meta: {
          icon: 'lucide:layers',
          title: $t('page.permission.module'),
        },
      },
      {
        name: 'PermissionRole',
        path: 'role',
        component: () => import('#/views/permission/role/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: $t('page.permission.role'),
        },
      },
      {
        name: 'PermissionMenu',
        path: 'menu',
        component: () => import('#/views/permission/menu/index.vue'),
        meta: {
          icon: 'lucide:menu',
          title: $t('page.permission.menu'),
        },
      },
    ],
  },
];

export default routes;
