import { Global, Module, ValidationPipe } from '@nestjs/common';
import { SharedService } from './shared.service';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AllExceptionFilter } from '@/common/filters/all-exception.filter';
import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import * as fs from 'fs';
import * as path from 'path';
import { RedisService } from './redis.service';
import { createClient } from 'redis';
import * as winston from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = process.env.NODE_ENV || 'development';
        const level =
          process.env.LOG_LEVEL ||
          configService.get('LOG_LEVEL') ||
          (nodeEnv === 'production' ? 'info' : 'debug');
        const logDir = process.env.LOG_DIR || configService.get('LOG_DIR') || 'logs';
        const consoleEnabled =
          (process.env.LOG_CONSOLE || configService.get('LOG_CONSOLE') || 'true') !== 'false';

        const resolvedLogDir = path.isAbsolute(logDir) ? logDir : path.join(process.cwd(), logDir);
        fs.mkdirSync(resolvedLogDir, { recursive: true });

        const fileFormat = winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        );

        const consoleFormat = winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf(({ level, message, timestamp, context, stack }) => {
            const ctx = context ? ` [${context}]` : '';
            const base = `${timestamp} ${level}${ctx} ${message}`;
            return stack ? `${base}\n${stack}` : base;
          }),
        );

        const transports: winston.transport[] = [
          new DailyRotateFile({
            dirname: resolvedLogDir,
            filename: 'application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level,
            format: fileFormat,
          }),
          new DailyRotateFile({
            dirname: resolvedLogDir,
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error',
            format: fileFormat,
          }),
        ];

        if (consoleEnabled) {
          transports.unshift(
            new winston.transports.Console({
              level,
              format: consoleFormat,
            }),
          );
        }

        return {
          level,
          transports,
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = process.env.NODE_ENV || 'development';
        const dbSync = process.env.DB_SYNC === 'true';

        // 生产环境强制禁用 synchronize
        if (nodeEnv === 'production' && dbSync) {
          throw new Error('生产环境禁止开启 DB_SYNC！这可能导致数据丢失。');
        }

        return {
          type: 'mysql',
          autoLoadEntities: true,
          host: process.env.DB_HOST || configService.get('DB_HOST'),
          port: +(process.env.DB_PORT || '3306') || configService.get('DB_PORT'),
          username: process.env.DB_USER || configService.get('DB_USER'),
          password: process.env.DB_PWD || configService.get('DB_PWD'),
          database: process.env.DB_DATABASE || configService.get('DB_DATABASE'),
          synchronize: nodeEnv === 'production' ? false : dbSync,
          timezone: '+08:00',
        };
      },
    }),
  ],
  providers: [
    SharedService,
    RedisService,
    {
      inject: [ConfigService],
      provide: 'REDIS_CLIENT',
      async useFactory(configService: ConfigService) {
        const client = createClient({
          url: configService.get('REDIS_URL'),
        });
        client.on('error', (err) => {
          console.error('Redis Client Error', err);
        });
        await client.connect();
        return client;
      },
    },
    {
      // 全局错误过滤器
      provide: APP_FILTER,
      useClass: AllExceptionFilter,
    },
    {
      // 全局拦截器
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      //全局参数校验管道
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true, // 自动类型转换
      }),
    },
  ],
  exports: [SharedService, RedisService],
})
export class SharedModule {}
