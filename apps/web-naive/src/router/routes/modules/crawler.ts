import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:bug',
      order: 14,
      title: $t('page.crawler.title'),
    },
    name: 'Crawler',
    path: '/crawler',
    redirect: '/crawler/task',
    children: [
      {
        name: 'CrawlerTask',
        path: 'task',
        component: () => import('#/views/crawler/task/index.vue'),
        meta: {
          icon: 'lucide:list-todo',
          title: $t('page.crawler.task'),
        },
      },
      {
        name: 'CrawlerResult',
        path: 'result',
        component: () => import('#/views/crawler/result/index.vue'),
        meta: {
          icon: 'lucide:file-search',
          title: $t('page.crawler.result'),
        },
      },
      {
        name: 'CrawlerArticle',
        path: 'article',
        component: () => import('#/views/crawler/article/index.vue'),
        meta: {
          icon: 'lucide:file-text',
          title: $t('page.crawler.article'),
        },
      },
    ],
  },
];

export default routes;
