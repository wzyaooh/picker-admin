import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { File, Folder, StorageQuota } from './entities';
import { FilePermissionService } from './services/file-permission.service';
import { FileUploadService } from './services/file-upload.service';
import { FileDownloadService } from './services/file-download.service';
import { FileRecycleBinService } from './services/file-recycle-bin.service';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
    @InjectRepository(Folder)
    private readonly folderRepo: Repository<Folder>,
    @InjectRepository(StorageQuota)
    private readonly storageQuotaRepo: Repository<StorageQuota>,
    private readonly permissionService: FilePermissionService,
    private readonly uploadService: FileUploadService,
    private readonly downloadService: FileDownloadService,
    private readonly recycleBinService: FileRecycleBinService,
  ) {}

  // --- 上传与创建相关 ---

  async uploadFile(buffer: Buffer, originalName: string, userId: number, folderId?: number, storageConfigId?: number) {
    return this.uploadService.uploadFile(buffer, originalName, userId, folderId, storageConfigId);
  }

  async createFolder(name: string, userId: number, parentId: number | null, storageConfigId?: number) {
    return this.uploadService.createFolder(name, userId, parentId, storageConfigId);
  }

  async copyFile(fileId: number, userId: number, targetFolderId: number | null) {
    return this.uploadService.copyFile(fileId, userId, targetFolderId);
  }

  async renameFile(fileId: number, userId: number, newName: string) {
    return this.uploadService.renameFile(fileId, userId, newName);
  }

  async moveFile(fileId: number, userId: number, targetFolderId: number | null) {
    return this.uploadService.moveFile(fileId, userId, targetFolderId);
  }

  async renameFolder(folderId: number, userId: number, newName: string) {
    return this.uploadService.renameFolder(folderId, userId, newName);
  }

  async moveFolder(folderId: number, userId: number, targetParentId: number | null) {
    return this.uploadService.moveFolder(folderId, userId, targetParentId);
  }

  // --- 下载相关 ---

  async downloadFile(fileId: number, userId: number) {
    return this.downloadService.downloadFile(fileId, userId);
  }

  // --- 删除与回收站相关 ---

  async deleteFile(fileId: number, userId: number) {
    return this.recycleBinService.deleteFile(fileId, userId);
  }

  async batchDeleteFiles(fileIds: number[], userId: number) {
    return this.recycleBinService.batchDeleteFiles(fileIds, userId);
  }

  async completelyDeleteFile(fileId: number, userId: number) {
    return this.recycleBinService.completelyDeleteFile(fileId, userId);
  }

  async restoreFile(fileId: number, userId: number) {
    return this.recycleBinService.restoreFile(fileId, userId);
  }

  async deleteFolder(folderId: number, userId: number) {
    return this.recycleBinService.deleteFolder(folderId, userId);
  }

  async restoreFolder(folderId: number, userId: number) {
    return this.recycleBinService.restoreFolder(folderId, userId);
  }

  async emptyRecycleBin(userId: number) {
    return this.recycleBinService.emptyRecycleBin(userId);
  }

  async permanentlyDeleteFile(fileId: number, userId: number) {
    return this.recycleBinService.completelyDeleteFile(fileId, userId);
  }

  async permanentlyDeleteFolder(folderId: number, userId: number) {
    // 简化实现，直接调用彻底删除逻辑
    const folder = await this.folderRepo.findOne({ where: { id: folderId, userId, isDeleted: true } });
    if (!folder) throw new CustomException(ErrorCode.ERR_20002, '文件夹不存在或未被删除');
    await this.folderRepo.remove(folder);
    await this.permissionService.updateStorageQuota(userId, 0, 0, -1);
    return true;
  }

  // --- 查询与统计相关 (保留在主 Service 或进一步拆分) ---

  async getFileList(userId: number, query: any) {
    const { folderId, storageConfigId, category, keyword, sortBy = 'name', sortOrder = 'asc', page = 1, pageSize = 30 } = query;
    const shouldIncludeFolders = !category || category === 'all';

    let folders: any[] = [];
    if (shouldIncludeFolders) {
      const folderQB = this.folderRepo.createQueryBuilder('folder')
        .where('folder.userId = :userId', { userId })
        .andWhere('folder.isDeleted = :isDeleted', { isDeleted: false });

      if (storageConfigId !== undefined) folderQB.andWhere('folder.storageConfigId = :storageConfigId', { storageConfigId });
      if (folderId !== undefined) folderQB.andWhere('folder.parentId = :parentId', { parentId: folderId });
      else folderQB.andWhere('folder.parentId IS NULL');
      if (keyword) folderQB.andWhere('folder.name LIKE :keyword', { keyword: `%${keyword}%` });

      const folderResults = await folderQB.orderBy('folder.name', 'ASC').getMany();
      folders = folderResults.map(f => ({ ...f, isFolder: true, mimeType: 'folder' }));
    }

    const fileQB = this.fileRepo.createQueryBuilder('file')
      .where('file.userId = :userId', { userId })
      .andWhere('file.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('file.isFolder = :isFolder', { isFolder: false });

    if (storageConfigId !== undefined) fileQB.andWhere('file.storageConfigId = :storageConfigId', { storageConfigId });
    if (folderId !== undefined) fileQB.andWhere('file.folderId = :folderId', { folderId });
    else if (!category || category === 'all') fileQB.andWhere('file.folderId IS NULL');

    if (category && category !== 'all') {
      const extensions = this.permissionService.getCategoryExtensions(category);
      if (category === 'other') {
        const known = [...this.permissionService.getCategoryExtensions('image'), ...this.permissionService.getCategoryExtensions('document'), ...this.permissionService.getCategoryExtensions('video'), ...this.permissionService.getCategoryExtensions('audio')];
        if (known.length > 0) fileQB.andWhere('file.extension NOT IN (:...known)', { known });
      } else if (extensions.length > 0) {
        fileQB.andWhere('file.extension IN (:...extensions)', { extensions });
      }
    }

    if (keyword) fileQB.andWhere('file.name LIKE :keyword', { keyword: `%${keyword}%` });
    
    const orderField = this.permissionService.getSortField(sortBy);
    fileQB.orderBy(`file.${orderField}`, sortOrder.toUpperCase() as any);

    const fileResults = await fileQB.getMany();
    const allItems = [...folders, ...fileResults.map(f => ({ ...f, isFolder: false }))];
    const skip = (page - 1) * pageSize;

    return {
      items: allItems.slice(skip, skip + pageSize),
      total: allItems.length,
      page,
      pageSize,
    };
  }

  async getStorageStats(userId: number, storageConfigId?: number) {
    const quotaResult = await this.storageQuotaRepo.query('SELECT * FROM storage_quota WHERE userId = ?', [userId]);
    let quota = quotaResult[0];
    if (!quota) {
      await this.storageQuotaRepo.query('INSERT INTO storage_quota (userId, total, used, fileCount, folderCount, createdAt, updatedAt) VALUES (?, ?, 0, 0, 0, NOW(), NOW())', [userId, 10 * 1024 * 1024 * 1024]);
      quota = (await this.storageQuotaRepo.query('SELECT * FROM storage_quota WHERE userId = ?', [userId]))[0];
    }

    let used = Number(quota.used);
    let fileCount = Number(quota.fileCount);
    let folderCount = Number(quota.folderCount);

    if (storageConfigId !== undefined) {
      const res = await this.fileRepo.createQueryBuilder('file').select('SUM(file.size)', 'total').addSelect('COUNT(*)', 'count').where('file.userId = :userId AND file.storageConfigId = :storageConfigId AND file.isDeleted = false', { userId, storageConfigId }).getRawOne();
      used = parseInt(res.total) || 0;
      fileCount = parseInt(res.count) || 0;
    } else {
      await this.permissionService.validateStorageQuota(userId, { total: Number(quota.total), used, fileCount, folderCount });
    }

    const total = Number(quota.total);
    return {
      total, used, available: total - used,
      usagePercent: total > 0 ? Math.round((used / total) * 10000) / 100 : 0,
      fileCount, folderCount,
      totalFormatted: this.permissionService.formatBytes(total),
      usedFormatted: this.permissionService.formatBytes(used),
      availableFormatted: this.permissionService.formatBytes(total - used),
    };
  }

  async getRecycleBinList(userId: number, query: any) {
    const { page = 1, pageSize = 30 } = query;
    const folders = await this.folderRepo.find({ where: { userId, isDeleted: true }, order: { deletedAt: 'DESC' } });
    const files = await this.fileRepo.find({ where: { userId, isDeleted: true }, order: { deletedAt: 'DESC' } });

    const all = [
      ...folders.map(f => ({ ...f, isFolder: true, mimeType: 'folder' })),
      ...files.map(f => ({ ...f, isFolder: false }))
    ].sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());

    const skip = (page - 1) * pageSize;
    return { items: all.slice(skip, skip + pageSize), total: all.length, page, pageSize };
  }

  async toggleFavorite(fileId: number, userId: number) {
    const file = await this.fileRepo.findOne({ where: { id: fileId, userId, isDeleted: false } });
    if (!file) throw new CustomException(ErrorCode.ERR_20002, '文件不存在');
    file.isFavorite = !file.isFavorite;
    return this.fileRepo.save(file);
  }

  async addTags(fileId: number, userId: number, tags: string[]) {
    const file = await this.fileRepo.findOne({ where: { id: fileId, userId, isDeleted: false } });
    if (!file) throw new CustomException(ErrorCode.ERR_20002, '文件不存在');
    file.tags = [...new Set([...(file.tags || []), ...tags])];
    return this.fileRepo.save(file);
  }

  async removeTags(fileId: number, userId: number, tags: string[]) {
    const file = await this.fileRepo.findOne({ where: { id: fileId, userId, isDeleted: false } });
    if (!file) throw new CustomException(ErrorCode.ERR_20002, '文件不存在');
    file.tags = (file.tags || []).filter(t => !tags.includes(t));
    return this.fileRepo.save(file);
  }

  async getFolderList(userId: number, parentId: number | null) {
    const query = this.folderRepo.createQueryBuilder('folder')
      .where('folder.userId = :userId', { userId })
      .andWhere('folder.isDeleted = :isDeleted', { isDeleted: false });

    if (parentId === null) {
      query.andWhere('folder.parentId IS NULL');
    } else {
      query.andWhere('folder.parentId = :parentId', { parentId });
    }

    return query.orderBy('folder.name', 'ASC').getMany();
  }

  async getFolderTree(userId: number) {
    const folders = await this.folderRepo.find({
      where: { userId, isDeleted: false },
      order: { name: 'ASC' },
    });

    const buildTree = (parentId: number | null): any[] => {
      return folders
        .filter(f => f.parentId === parentId)
        .map(f => ({
          ...f,
          children: buildTree(f.id),
        }));
    };

    return buildTree(null);
  }

  async getCategoryStats(userId: number, storageConfigId?: number) {
    const fileQB = this.fileRepo.createQueryBuilder('file')
      .select('file.extension', 'extension')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(file.size)', 'size')
      .where('file.userId = :userId', { userId })
      .andWhere('file.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('file.isFolder = :isFolder', { isFolder: false });

    if (storageConfigId !== undefined) {
      fileQB.andWhere('file.storageConfigId = :storageConfigId', { storageConfigId });
    }

    const results = await fileQB.groupBy('file.extension').getRawMany();

    const stats = {
      image: { count: 0, size: 0 },
      document: { count: 0, size: 0 },
      video: { count: 0, size: 0 },
      audio: { count: 0, size: 0 },
      other: { count: 0, size: 0 },
    };

    for (const res of results) {
      const ext = res.extension;
      const count = parseInt(res.count);
      const size = parseInt(res.size);

      let matched = false;
      for (const category of ['image', 'document', 'video', 'audio'] as const) {
        if (this.permissionService.getCategoryExtensions(category).includes(ext)) {
          stats[category].count += count;
          stats[category].size += size;
          matched = true;
          break;
        }
      }

      if (!matched) {
        stats.other.count += count;
        stats.other.size += size;
      }
    }

    return Object.entries(stats).map(([category, data]) => ({
      category,
      ...data,
      sizeFormatted: this.permissionService.formatBytes(data.size),
    }));
  }

  async getFilesByTags(userId: number, tags: string[], query: any) {
    const { page = 1, pageSize = 30 } = query;
    
    // 简单的标签包含逻辑，这里假设 tags 是一个 JSON 数组或类似结构
    // 实际生产中可能需要专门的标签关联表，这里保持原逻辑
    const fileQB = this.fileRepo.createQueryBuilder('file')
      .where('file.userId = :userId', { userId })
      .andWhere('file.isDeleted = :isDeleted', { isDeleted: false });

    // 使用 Postgres/MySQL 的 JSON 相关函数或简单的 LIKE（取决于数据库）
    // 这里采用通用的内存过滤作为回退或简单的逻辑演示
    const allFiles = await fileQB.getMany();
    const filtered = allFiles.filter(f => 
      tags.every(t => (f.tags || []).includes(t))
    );

    const skip = (page - 1) * pageSize;
    return {
      items: filtered.slice(skip, skip + pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  async getFavoriteList(userId: number, query: any) {
    const { page = 1, pageSize = 30 } = query;
    const [items, total] = await this.fileRepo.findAndCount({
      where: { userId, isDeleted: false, isFavorite: true },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }
}
