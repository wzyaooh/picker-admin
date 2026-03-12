import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { findFileOrFail } from '../file.helper';
import { File } from '../entities';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class FileDownloadService {
  private readonly logger = new Logger(FileDownloadService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
    private readonly storageService: StorageService,
  ) {}

  /**
   * 下载文件
   */
  async downloadFile(fileId: number, userId: number): Promise<{ buffer: Buffer; file: File }> {
    const file = await findFileOrFail(this.fileRepo, fileId, userId);
    const adapter = await this.storageService.getDefaultAdapter();

    try {
      const buffer = await adapter.download(file.path);
      return { buffer, file };
    } catch (error) {
      this.logger.error(`Failed to download file ${fileId}: ${error.message}`);
      throw error;
    }
  }
}
