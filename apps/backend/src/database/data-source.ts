import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// 加载 .env 文件
dotenv.config();

// 注意：此文件用于 TypeORM CLI，环境变量需要在运行命令前加载
// 例如：NODE_ENV=development npm run migration:generate

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PWD || '',
  database: process.env.DB_DATABASE || '',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false, // 使用 migrations 后必须关闭
  timezone: '+08:00',
  charset: 'utf8mb4',
});
