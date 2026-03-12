import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
            // 后端服务地址
            target: 'http://localhost:8085',
            ws: true,
          },
          '/files': {
            changeOrigin: true,
            // 静态文件服务地址
            target: 'http://localhost:8085',
          },
          '/crawler-api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/crawler-api/, '/crawler'),
            // 爬虫服务地址
            target: 'http://localhost:5321',
            ws: false,
          },
        },
      },
    },
  };
}) as any;
