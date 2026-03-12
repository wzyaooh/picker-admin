import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { File, Folder, StorageQuota } from '../entities';

@Injectable()
export class FilePermissionService {
  private readonly logger = new Logger(FilePermissionService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
    @InjectRepository(Folder)
    private readonly folderRepo: Repository<Folder>,
    @InjectRepository(StorageQuota)
    private readonly storageQuotaRepo: Repository<StorageQuota>,
  ) {}

  /**
   * 检查存储配额（带事务锁，解决并发问题）
   * @param userId 用户ID
   * @param fileSize 文件大小（字节）
   * @throws CustomException 当存储空间不足时抛出异常
   */
  async checkStorageQuota(userId: number, fileSize: number): Promise<void> {
    const queryRunner = this.storageQuotaRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const result = await queryRunner.query(
        'SELECT total, used FROM storage_quota WHERE userId = ? FOR UPDATE',
        [userId]
      );

      if (!result || result.length === 0) {
        await queryRunner.query(
          'INSERT INTO storage_quota (userId, total, used, fileCount, folderCount, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [userId, 10 * 1024 * 1024 * 1024, 0, 0, 0]
        );
        await queryRunner.commitTransaction();
        return;
      }

      const quota = result[0];
      let total = typeof quota.total === 'bigint' ? Number(quota.total) : Number(quota.total);
      let used = typeof quota.used === 'bigint' ? Number(quota.used) : Number(quota.used);
      
      // 数据有效性检查
      if (Number.isNaN(total) || Number.isNaN(used) || total < 0 || used < 0) {
        this.logger.warn(`Invalid storage quota data for user ${userId}, resetting`);
        await queryRunner.query(
          'UPDATE storage_quota SET used = 0, fileCount = 0, folderCount = 0 WHERE userId = ?',
          [userId]
        );
        
        const resetResult = await queryRunner.query(
          'SELECT total, used FROM storage_quota WHERE userId = ? FOR UPDATE',
          [userId]
        );
        
        total = Number(resetResult[0].total);
        used = Number(resetResult[0].used);
      }
      
      const available = total - used;
      
      // 可用空间有效性检查
      if (available < 0) {
        this.logger.warn(`Negative available space for user ${userId}, validating`);
        
        const actualUsedResult = await queryRunner.query(
          'SELECT COALESCE(SUM(size), 0) as total FROM file WHERE userId = ? AND isDeleted = false',
          [userId]
        );
        const actualUsed = Number(actualUsedResult[0].total) || 0;
        
        await queryRunner.query(
          'UPDATE storage_quota SET used = ? WHERE userId = ?',
          [actualUsed, userId]
        );
        
        const validatedResult = await queryRunner.query(
          'SELECT total, used FROM storage_quota WHERE userId = ? FOR UPDATE',
          [userId]
        );
        
        total = Number(validatedResult[0].total);
        used = Number(validatedResult[0].used);
        const newAvailable = total - used;
        
        if (fileSize > newAvailable) {
          throw new CustomException(
            ErrorCode.ERR_20101,
            `存储空间不足。需要 ${this.formatBytes(fileSize)}，可用 ${this.formatBytes(newAvailable)}`,
          );
        }
      } else if (fileSize > available) {
        throw new CustomException(
          ErrorCode.ERR_20101,
          `存储空间不足。需要 ${this.formatBytes(fileSize)}，可用 ${this.formatBytes(available)}`,
        );
      }
      
      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 更新存储配额
   * @param userId 用户ID
   * @param sizeChange 空间变化量（字节，可为负数）
   * @param fileCountChange 文件数量变化（可为负数）
   * @param folderCountChange 文件夹数量变化（可为负数）
   */
  async updateStorageQuota(
    userId: number,
    sizeChange: number,
    fileCountChange: number,
    folderCountChange: number,
  ): Promise<void> {
    const quota = await this.storageQuotaRepo.findOne({
      where: { userId },
    });

    if (!quota) {
      await this.storageQuotaRepo.query(
        'INSERT INTO storage_quota (userId, total, used, fileCount, folderCount, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [userId, 10 * 1024 * 1024 * 1024, sizeChange, fileCountChange, folderCountChange]
      );
    } else {
      const oldUsed = Number(quota.used);
      const oldFileCount = Number(quota.fileCount);
      const oldFolderCount = Number(quota.folderCount);
      
      // Calculate new values
      let newUsed = oldUsed + sizeChange;
      let newFileCount = oldFileCount + fileCountChange;
      let newFolderCount = oldFolderCount + folderCountChange;
      
      // 边界检查：防止负数
      if (newUsed < 0) {
        this.logger.warn(`Storage quota would become negative (${newUsed}), resetting to 0`);
        newUsed = 0;
      }
      if (newFileCount < 0) {
        this.logger.warn(`File count would become negative (${newFileCount}), resetting to 0`);
        newFileCount = 0;
      }
      if (newFolderCount < 0) {
        this.logger.warn(`Folder count would become negative (${newFolderCount}), resetting to 0`);
        newFolderCount = 0;
      }
      
      await this.storageQuotaRepo.query(
        'UPDATE storage_quota SET used = ?, fileCount = ?, folderCount = ? WHERE userId = ?',
        [newUsed, newFileCount, newFolderCount, userId]
      );
    }
  }

  /**
   * 校验存储配额准确性（自动修正不一致的配额数据）
   * @param userId 用户ID
   * @param quota 当前配额数据
   */
  async validateStorageQuota(
    userId: number, 
    quota: { total: number; used: number; fileCount: number; folderCount: number }
  ): Promise<void> {
    // 计算实际使用量
    const actualUsedResult = await this.fileRepo
      .createQueryBuilder('file')
      .select('COALESCE(SUM(file.size), 0)', 'total')
      .where('file.userId = :userId', { userId })
      .andWhere('file.isDeleted = false')
      .getRawOne();

    const actualFileCountResult = await this.fileRepo
      .createQueryBuilder('file')
      .select('COUNT(*)', 'count')
      .where('file.userId = :userId', { userId })
      .andWhere('file.isDeleted = false')
      .getRawOne();

    const actualFolderCountResult = await this.folderRepo
      .createQueryBuilder('folder')
      .select('COUNT(*)', 'count')
      .where('folder.userId = :userId', { userId })
      .andWhere('folder.isDeleted = false')
      .getRawOne();

    const actualUsed = parseInt(actualUsedResult.total) || 0;
    const actualFileCount = parseInt(actualFileCountResult.count) || 0;
    const actualFolderCount = parseInt(actualFolderCountResult.count) || 0;

    // 如果差异超过 1KB 或数量不一致，则修正
    const sizeDiff = Math.abs(quota.used - actualUsed);
    const fileCountDiff = quota.fileCount !== actualFileCount;
    const folderCountDiff = quota.folderCount !== actualFolderCount;

    if (sizeDiff > 1024 || fileCountDiff || folderCountDiff) {
      this.logger.warn(
        `Storage quota mismatch for user ${userId}: ` +
        `used ${quota.used} vs ${actualUsed} (diff: ${sizeDiff}), ` +
        `fileCount ${quota.fileCount} vs ${actualFileCount}, ` +
        `folderCount ${quota.folderCount} vs ${actualFolderCount}. Correcting...`
      );

      // Use raw SQL to avoid TypeORM bigint issues
      await this.storageQuotaRepo.query(
        'UPDATE storage_quota SET used = ?, fileCount = ?, folderCount = ? WHERE userId = ?',
        [actualUsed, actualFileCount, actualFolderCount, userId]
      );

      this.logger.log(`Storage quota corrected for user ${userId}`);
    }
  }

  /**
   * 格式化字节数为可读格式
   * @param bytes 字节数
   * @returns 格式化后的字符串（如 "1.5 MB"）
   */
  formatBytes(bytes: number | bigint): string {
    if (bytes == null || Number.isNaN(Number(bytes))) {
      return '0 B';
    }
    
    const numBytes = typeof bytes === 'bigint' ? Number(bytes) : bytes;
    
    if (numBytes < 0) {
      return `-${this.formatBytes(Math.abs(numBytes))}`;
    }
    
    if (numBytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    return `${(numBytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * 获取分类对应的文件扩展名
   */
  getCategoryExtensions(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
      document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'],
      video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'],
      audio: ['mp3', 'wav', 'flac', 'aac', 'ogg'],
    };

    return categoryMap[category] || [];
  }

  /**
   * 获取排序字段映射
   */
  getSortField(sortBy: string): string {
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      size: 'size',
      date: 'createdAt',
      type: 'extension',
    };

    return sortFieldMap[sortBy] || 'name';
  }
}
