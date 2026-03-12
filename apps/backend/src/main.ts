import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { randomUUID } from 'crypto';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  process.on('unhandledRejection', (reason) => {
    logger.error(`unhandledRejection: ${String(reason)}`);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`uncaughtException: ${err.message}`, err.stack);
  });

  // 信任代理，以便正确获取客户端真实 IP
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = req.header('x-request-id') || randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const requestId = (req as any).requestId;
      logger.log(
        `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms${requestId ? ` requestId=${requestId}` : ''}`,
        'Http',
      );
    });
    next();
  });

  // 配置 CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5888',
      'http://localhost:5889',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });

  // 设置全局 API 前缀
  app.setGlobalPrefix('api/v1');

  // 配置动态静态文件服务 - 根据文件的存储配置动态查找文件
  // 这样可以支持多个存储配置，每个配置有自己的物理目录
  const dataSource = app.get(DataSource);
  
  app.use('/files', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 解码 URL 中的中文字符
      const decodedPath = decodeURIComponent(req.path);
      logger.log(`[StaticFiles] Request: ${req.path} -> ${decodedPath}`, 'StaticFiles');
      
      // 从数据库查询文件信息（包括存储配置）
      const fileRepo = dataSource.getRepository('File');
      const storageConfigRepo = dataSource.getRepository('StorageConfig');
      
      // 查找文件记录（通过路径匹配）
      // 移除开头的斜杠，确保路径格式一致
      const filePath = decodedPath.startsWith('/') ? decodedPath.substring(1) : decodedPath;
      logger.log(`[StaticFiles] Looking for file with path: "${filePath}"`, 'StaticFiles');
      
      const file = await fileRepo.findOne({
        where: { path: filePath },
      });
      
      if (!file) {
        logger.error(`[StaticFiles] File record not found in database: ${filePath}`, 'StaticFiles');
        logger.error(`[StaticFiles] Original request path: ${req.path}`, 'StaticFiles');
        
        // 尝试直接从文件系统提供文件（兜底方案）
        // 这样即使数据库记录有问题，文件仍然可以访问
        const defaultStoragePath = './uploads';
        const uploadsPath = path.isAbsolute(defaultStoragePath) 
          ? defaultStoragePath 
          : path.join(process.cwd(), defaultStoragePath);
        const fullPath = path.join(uploadsPath, filePath);
        
        logger.log(`[StaticFiles] Trying fallback: ${fullPath}`, 'StaticFiles');
        
        fs.access(fullPath, fs.constants.R_OK, (err) => {
          if (err) {
            logger.error(`[StaticFiles] Fallback failed: File not found: ${fullPath}`, 'StaticFiles');
            res.status(404).send('File not found');
          } else {
            logger.log(`[StaticFiles] ✅ Fallback success: Sending file: ${fullPath}`, 'StaticFiles');
            res.sendFile(fullPath);
          }
        });
        return;
      }
      
      logger.log(`[StaticFiles] Found file record: id=${file.id}, name=${file.name}, path=${file.path}, storageConfigId=${file.storageConfigId}`, 'StaticFiles');
      
      // 查找存储配置
      const storageConfig = await storageConfigRepo.findOne({
        where: { id: file.storageConfigId },
      });
      
      if (!storageConfig) {
        logger.error(`[StaticFiles] Storage config not found: id=${file.storageConfigId}`, 'StaticFiles');
        res.status(404).send('Storage configuration not found');
        return;
      }
      
      logger.log(`[StaticFiles] Storage config: type=${storageConfig.type}, path=${storageConfig.storagePath}`, 'StaticFiles');
      
      // 根据存储类型处理
      if (storageConfig.type === 'local') {
        // 本地存储：使用存储配置的 storagePath
        const storagePath = storageConfig.storagePath || './uploads';
        const uploadsPath = path.isAbsolute(storagePath) 
          ? storagePath 
          : path.join(process.cwd(), storagePath);
        
        // 构建完整文件路径
        const fullPath = path.join(uploadsPath, file.path);
        logger.log(`[StaticFiles] Full path: ${fullPath}`, 'StaticFiles');
        
        // 检查文件是否存在
        fs.access(fullPath, fs.constants.R_OK, (err) => {
          if (err) {
            logger.error(`[StaticFiles] File not found or not readable: ${fullPath}`, 'StaticFiles');
            res.status(404).send('File not found');
          } else {
            logger.log(`[StaticFiles] ✅ Sending file: ${fullPath}`, 'StaticFiles');
            // 设置正确的 Content-Type
            if (file.mimeType) {
              res.setHeader('Content-Type', file.mimeType);
            }
            // 文件存在，发送文件
            res.sendFile(fullPath);
          }
        });
      } else {
        // 对象存储：返回重定向到对象存储URL
        logger.log(`[StaticFiles] Redirecting to object storage URL: ${file.url}`, 'StaticFiles');
        res.redirect(file.url);
      }
    } catch (error) {
      logger.error(`[StaticFiles] Error: ${error.message}`, error.stack, 'StaticFiles');
      res.status(500).send('Internal server error');
    }
  });
  
  logger.log(`Dynamic static file serving enabled`, 'Bootstrap');

  const groupSwaggerByController = (document: OpenAPIObject) => {
    const controllerCnNameMap: Record<string, string> = {
      AuthController: '认证',
      Auth: '认证',
      UserController: '用户',
      User: '用户',
      RoleController: '角色',
      Role: '角色',
      PermissionController: '权限',
      Permission: '权限',
      AuditController: '审计',
      Audit: '审计',
      HealthController: '健康检查',
      Health: '健康检查',
    };

    const tagMap = new Map<string, { name: string }>();
    const paths: any = document.paths;
    if (!paths) return;

    for (const pathItem of Object.values(paths) as any[]) {
      if (!pathItem) continue;
      for (const op of Object.values(pathItem) as any[]) {
        if (!op || typeof op !== 'object') continue;
        const operationId = op.operationId as string | undefined;
        if (!operationId) continue;
        const controllerKey = operationId.split('_')[0];
        if (!controllerKey) continue;
        const controllerKeyWithSuffix = controllerKey.endsWith('Controller')
          ? controllerKey
          : `${controllerKey}Controller`;
        const cnName =
          controllerCnNameMap[controllerKey] ||
          controllerCnNameMap[controllerKeyWithSuffix] ||
          controllerKey.replace(/Controller$/, '');

        op.tags = [cnName];
        if (!tagMap.has(cnName)) tagMap.set(cnName, { name: cnName });
      }
    }

    document.tags = Array.from(tagMap.values());
  };

  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  const swaggerPath = process.env.SWAGGER_PATH || 'docs';

  if (swaggerEnabled && process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('isme-nest-serve API')
      .setDescription('基于 NestJS + TypeORM + MySQL + Redis 的后端管理系统 API 文档')
      .setVersion('1.0.0')
      .setContact('开发团队', '', 'dev@example.com')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('http://localhost:8085', '本地开发环境')
      .addServer('https://api-dev.example.com', '开发环境')
      .addServer('https://api.example.com', '生产环境')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: '请输入 JWT Token',
          in: 'header',
        },
        'bearer',
      )
      .addTag('认证', '用户认证相关接口')
      .addTag('用户', '用户管理相关接口')
      .addTag('角色', '角色管理相关接口')
      .addTag('权限', '权限管理相关接口')
      .addTag('审计', '审计日志相关接口')
      .addTag('健康检查', '系统健康检查接口')
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        `${controllerKey}_${methodKey}`,
    });
    groupSwaggerByController(document);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
      },
      customSiteTitle: 'isme-nest-serve API 文档',
      customCss: '.swagger-ui .topbar { display: none }',
    });
  }

  const port = process.env.APP_PORT || 8085;
  await app.listen(port);

  logger.log(`启动成功: http://localhost:${port}`, 'Bootstrap');
  logger.log(`Swagger: http://localhost:${port}/${swaggerPath}`, 'Bootstrap');
}
bootstrap();
