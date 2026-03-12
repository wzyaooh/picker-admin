import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { StorageService } from './storage/storage.service';
import { StorageConfigController } from './storage-config.controller';
import { StorageConfigService } from './storage-config.service';
import { UploadRateLimitGuard } from './guards/upload-rate-limit.guard';
import {
  File,
  Folder,
  StorageConfig,
  ObjectStorageConfig,
  FileVersion,
  FileShare,
  StorageQuota,
} from './entities';

import { FilePermissionService } from './services/file-permission.service';
import { FileUploadService } from './services/file-upload.service';
import { FileDownloadService } from './services/file-download.service';
import { FileRecycleBinService } from './services/file-recycle-bin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      File,
      Folder,
      StorageConfig,
      ObjectStorageConfig,
      FileVersion,
      FileShare,
      StorageQuota,
    ]),
    ConfigModule,
    // 配置 Multer 文件上传限制
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        limits: {
          fileSize: parseInt(
            configService.get<string>('FILE_MAX_SIZE', '104857600'), // 默认 100MB
            10,
          ),
          files: parseInt(
            configService.get<string>('FILE_MAX_COUNT', '10'), // 默认最多 10 个文件
            10,
          ),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [FileController, StorageConfigController],
  providers: [
    FileService,
    StorageService,
    StorageConfigService,
    UploadRateLimitGuard,
    FilePermissionService,
    FileUploadService,
    FileDownloadService,
    FileRecycleBinService,
  ],
  exports: [FileService, StorageService, StorageConfigService],
})
export class FileModule {}
