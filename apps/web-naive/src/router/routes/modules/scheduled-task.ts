import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:clock',
      order: 14,
      title: $t('page.scheduledTask.title'),
    },
    name: 'ScheduledTask',
    path: '/scheduled-task',
    redirect: '/scheduled-task/task',
    children: [
      {
        name: 'ScheduledTaskTask',
        path: 'task',
        component: () => import('#/views/scheduled-task/task/index.vue'),
        meta: {
          icon: 'lucide:list-todo',
          title: $t('page.scheduledTask.task'),
        },
      },
      {
        name: 'ScheduledTaskLog',
        path: 'log',
        component: () => import('#/views/scheduled-task/log/index.vue'),
        meta: {
          icon: 'lucide:file-text',
          title: $t('page.scheduledTask.log'),
        },
      },
    ],
  },
];

export default routes;
