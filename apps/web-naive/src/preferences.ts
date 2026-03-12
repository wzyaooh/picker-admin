import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    name: import.meta.env.VITE_APP_TITLE,
    // 路由模式：frontend(前端静态路由) | backend(后端动态路由)
    // 从环境变量读取，默认为 backend
    accessMode: (import.meta.env.VITE_ACCESS_MODE || 'backend') as 'frontend' | 'backend',
    // 默认首页路径
    defaultHomePath: '/dashboard/analytics',
  },
});
