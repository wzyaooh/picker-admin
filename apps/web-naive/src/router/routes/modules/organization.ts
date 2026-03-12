import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:building-2',
      order: 11,
      title: $t('page.organization.title'),
    },
    name: 'Organization',
    path: '/organization',
    redirect: '/organization/overview',
    children: [
      {
        name: 'OrganizationOverview',
        path: 'overview',
        component: () => import('#/views/organization/overview/index.vue'),
        meta: {
          icon: 'lucide:layout-dashboard',
          title: $t('page.organization.overview'),
        },
      },
      {
        name: 'OrganizationOrg',
        path: 'org',
        component: () => import('#/views/organization/org/index.vue'),
        meta: {
          icon: 'lucide:network',
          title: $t('page.organization.org'),
        },
      },
      {
        name: 'OrganizationUser',
        path: 'user',
        component: () => import('#/views/organization/user/index.vue'),
        meta: {
          icon: 'lucide:user',
          title: $t('page.organization.user'),
        },
      },
      {
        name: 'OrganizationPosition',
        path: 'position',
        component: () => import('#/views/organization/position/index.vue'),
        meta: {
          icon: 'lucide:briefcase',
          title: $t('page.organization.position'),
        },
      },
      {
        name: 'OrganizationGroup',
        path: 'group',
        component: () => import('#/views/organization/group/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: $t('page.organization.group'),
        },
      },
    ],
  },
];

export default routes;
