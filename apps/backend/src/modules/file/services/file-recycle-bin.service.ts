import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { checkDuplicateFileName, findFileOrFail } from '../file.helper';
import { File, Folder } from '../entities';
import { StorageService } from '../storage/storage.service';
import { FilePermissionService } from './file-permission.service';

@Injectable()
export class FileRecycleBinService {
  private readonly logger = new Logger(FileRecycleBinService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
    @InjectRepository(Folder)
    private readonly folderRepo: Repository<Folder>,
    private readonly storageService: StorageService,
    private readonly permissionService: FilePermissionService,
  ) {}

  /**
   * 删除文件（软删除）
   */
  async deleteFile(fileId: number, userId: number): Promise<boolean> {
    const file = await findFileOrFail(this.fileRepo, fileId, userId);
    await this.movePhysicalFileToRecycleBin(file);

    file.isDeleted = true;
    file.deletedAt = new Date();
    await this.fileRepo.save(file);
    return true;
  }

  /**
   * 批量删除文件
   */
  async batchDeleteFiles(fileIds: number[], userId: number): Promise<boolean> {
    const files = await this.fileRepo.find({
      where: { id: In(fileIds), userId, isDeleted: false },
    });

    if (files.length === 0) {
      throw new CustomException(ErrorCode.ERR_20002, '没有找到可删除的文件');
    }

    const now = new Date();
    for (const file of files) {
      await this.movePhysicalFileToRecycleBin(file);
      file.isDeleted = true;
      file.deletedAt = now;
    }

    await this.fileRepo.save(files);
    return true;
  }

  /**
   * 彻底删除文件（直接硬删除）
   */
  async completelyDeleteFile(fileId: number, userId: number): Promise<boolean> {
    const file = await findFileOrFail(this.fileRepo, fileId, userId);
    try {
      const adapter = await this.storageService.getDefaultAdapter();
      await adapter.delete(file.path);
    } catch (error) {
      this.logger.error(`Failed to delete physical file: ${error.message}`);
    }
    await this.fileRepo.remove(file);
    return true;
  }

  /**
   * 恢复文件
   */
  async restoreFile(fileId: number, userId: number): Promise<File> {
    const file = await findFileOrFail(this.fileRepo, fileId, userId, true);
    await checkDuplicateFileName(this.fileRepo, file.name, file.folderId, userId);
    await this.restorePhysicalFile(file);

    file.isDeleted = false;
    file.deletedAt = undefined as any;
    file.updatedAt = new Date();
    return this.fileRepo.save(file);
  }

  /**
   * 删除文件夹
   */
  async deleteFolder(folderId: number, userId: number): Promise<boolean> {
    const folder = await this.folderRepo.findOne({
      where: { id: folderId, userId, isDeleted: false },
    });

    if (!folder) throw new CustomException(ErrorCode.ERR_20002, '文件夹不存在');

    const isEmpty = await this.isFolderEmpty(folderId, userId);
    if (isEmpty) {
      await this.deleteEmptyFolderPhysically(folder, userId);
    } else {
      await this.moveFolderToRecycleBin(folderId, userId);
    }

    return true;
  }

  /**
   * 恢复文件夹
   */
  async restoreFolder(folderId: number, userId: number): Promise<Folder> {
    const folder = await this.folderRepo.findOne({
      where: { id: folderId, userId, isDeleted: true },
    });

    if (!folder) throw new CustomException(ErrorCode.ERR_20002, '文件夹不存在或未被删除');

    const existingFolder = await this.folderRepo.findOne({
      where: {
        name: folder.name,
        parentId: folder.parentId === null || folder.parentId === undefined ? IsNull() : folder.parentId,
        userId,
        isDeleted: false,
      },
    });

    if (existingFolder) throw new CustomException(ErrorCode.ERR_20001, '原位置已存在同名文件夹');

    await this.restorePhysicalFolder(folder);
    folder.isDeleted = false;
    folder.deletedAt = undefined as any;
    folder.updatedAt = new Date();
    await this.folderRepo.save(folder);
    await this.restoreFolderContentsRecursive(folderId, userId);

    return folder;
  }

  /**
   * 清空回收站
   */
  async emptyRecycleBin(userId: number): Promise<boolean> {
    const deletedFiles = await this.fileRepo.find({ where: { userId, isDeleted: true } });
    const deletedFolders = await this.folderRepo.find({
      where: { userId, isDeleted: true },
      order: { path: 'DESC' },
    });

    if (deletedFiles.length === 0 && deletedFolders.length === 0) return true;

    for (const file of deletedFiles) {
      try {
        const adapter = file.storageConfigId
          ? await this.storageService.getAdapterByConfigId(file.storageConfigId)
          : await this.storageService.getDefaultAdapter();
        await adapter.delete(file.path);
      } catch (error) {
        this.logger.error(`Failed to delete physical file ${file.path}: ${error.message}`);
      }
    }

    for (const folder of deletedFolders) {
      try {
        if (!folder.storageConfigId) continue;
        const storageConfig = await this.storageService.getConfigById(folder.storageConfigId);
        if (!storageConfig.enableRecycleBin) continue;

        const adapter = await this.storageService.getAdapterByConfigId(folder.storageConfigId);
        const recycleBinPath = storageConfig.recycleBinPath || '.RECYCLE.BIN/';
        const folderPath = folder.path.startsWith('/') ? folder.path.substring(1) : folder.path;
        const physicalPath = `${recycleBinPath}${folderPath}`;
        
        if (typeof (adapter as any).deleteDirectory === 'function') {
          await (adapter as any).deleteDirectory(physicalPath);
        }
      } catch (error) {
        this.logger.error(`Failed to delete physical folder ${folder.path}: ${error.message}`);
      }
    }

    if (deletedFiles.length > 0) await this.fileRepo.remove(deletedFiles);
    if (deletedFolders.length > 0) await this.folderRepo.remove(deletedFolders);

    return true;
  }

  // --- 物理操作辅助方法 ---

  private async movePhysicalFileToRecycleBin(file: File): Promise<void> {
    if (!file.storageConfigId) return;
    try {
      const storageConfig = await this.storageService.getConfigById(file.storageConfigId);
      if (!storageConfig.enableRecycleBin) return;

      const adapter = await this.storageService.getAdapterByConfigId(file.storageConfigId);
      const recycleBinPath = storageConfig.recycleBinPath || '.RECYCLE.BIN/';
      const sourcePath = file.path;
      const targetPath = `${recycleBinPath}${file.path}`;
      
      if (await adapter.exists(sourcePath)) {
        const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
        if (targetDir) await adapter.createDirectory(targetDir);
        
        if (typeof (adapter as any).rename === 'function') {
          await (adapter as any).rename(sourcePath, targetPath);
          file.path = targetPath;
          file.url = `/files/${targetPath}`;
        }
      }
    } catch (error) {
      this.logger.error(`Failed to move file to recycle bin: ${error.message}`);
    }
  }

  private async restorePhysicalFile(file: File): Promise<void> {
    if (!file.storageConfigId) return;
    try {
      const storageConfig = await this.storageService.getConfigById(file.storageConfigId);
      if (!storageConfig.enableRecycleBin) return;

      const adapter = await this.storageService.getAdapterByConfigId(file.storageConfigId);
      const recycleBinPath = storageConfig.recycleBinPath || '.RECYCLE.BIN/';
      
      let sourcePath: string;
      let targetPath: string;
      if (file.path.startsWith(recycleBinPath)) {
        sourcePath = file.path;
        targetPath = file.path.replace(recycleBinPath, '');
      } else {
        sourcePath = `${recycleBinPath}${file.path}`;
        targetPath = file.path;
      }
      
      if (await adapter.exists(sourcePath)) {
        const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
        if (targetDir) await adapter.createDirectory(targetDir);
        if (typeof (adapter as any).rename === 'function') {
          await (adapter as any).rename(sourcePath, targetPath);
          file.path = targetPath;
          file.url = `/files/${targetPath}`;
        }
      }
    } catch (error) {
      this.logger.error(`Failed to restore physical file: ${error.message}`);
      throw new CustomException(ErrorCode.ERR_20001, '恢复物理文件失败');
    }
  }

  private async isFolderEmpty(folderId: number, userId: number): Promise<boolean> {
    const fileCount = await this.fileRepo.count({ where: { folderId, userId, isDeleted: false } });
    if (fileCount > 0) return false;
    const subFolderCount = await this.folderRepo.count({ where: { parentId: folderId, userId, isDeleted: false } });
    return subFolderCount === 0;
  }

  private async deleteEmptyFolderPhysically(folder: Folder, userId: number): Promise<void> {
    try {
      if (!folder.storageConfigId) {
        const defaultConfig = await this.storageService.getDefaultConfig();
        folder.storageConfigId = defaultConfig.id;
      }
      const adapter = await this.storageService.getAdapterByConfigId(folder.storageConfigId);
      const physicalPath = folder.path.startsWith('/') ? folder.path.substring(1) : folder.path;
      if (typeof (adapter as any).deleteDirectory === 'function') {
        await (adapter as any).deleteDirectory(physicalPath);
      }
    } catch (error) {
      this.logger.error(`Failed to delete physical folder: ${error.message}`);
      throw new CustomException(ErrorCode.ERR_20001, '删除物理文件夹失败');
    }
    await this.folderRepo.remove(folder);
    await this.permissionService.updateStorageQuota(userId, 0, 0, -1);
  }

  private async moveFolderToRecycleBin(folderId: number, userId: number): Promise<void> {
    await this.markFolderAsDeletedRecursive(folderId, userId);
    await this.movePhysicalFolderToRecycleBin(folderId, userId);
  }

  private async markFolderAsDeletedRecursive(folderId: number, userId: number): Promise<void> {
    const folder = await this.folderRepo.findOne({ where: { id: folderId, userId, isDeleted: false } });
    if (!folder) return;

    const now = new Date();
    const files = await this.fileRepo.find({ where: { folderId, userId, isDeleted: false } });
    files.forEach(f => { f.isDeleted = true; f.deletedAt = now; });
    if (files.length > 0) await this.fileRepo.save(files);

    const subFolders = await this.folderRepo.find({ where: { parentId: folderId, userId, isDeleted: false } });
    for (const subFolder of subFolders) await this.markFolderAsDeletedRecursive(subFolder.id, userId);

    folder.isDeleted = true;
    folder.deletedAt = now;
    await this.folderRepo.save(folder);
  }

  private async movePhysicalFolderToRecycleBin(folderId: number, userId: number): Promise<void> {
    const folder = await this.folderRepo.findOne({ where: { id: folderId, userId } });
    if (!folder || !folder.storageConfigId) return;

    try {
      const storageConfig = await this.storageService.getConfigById(folder.storageConfigId);
      if (!storageConfig.enableRecycleBin) return;

      const adapter = await this.storageService.getAdapterByConfigId(folder.storageConfigId);
      const sourcePath = folder.path.startsWith('/') ? folder.path.substring(1) : folder.path;
      const recycleBinPath = storageConfig.recycleBinPath || '.RECYCLE.BIN/';
      const targetPath = `${recycleBinPath}${sourcePath}`;
      
      if (typeof (adapter as any).createDirectory === 'function') await (adapter as any).createDirectory(recycleBinPath);
      if (typeof (adapter as any).rename === 'function') {
        await (adapter as any).rename(sourcePath, targetPath);
        await this.updateFilePathsInFolderRecursive(folderId, sourcePath, targetPath, true);
      }
    } catch (error) {
      this.logger.error(`Failed to move folder to recycle bin: ${error.message}`);
    }
  }

  private async restorePhysicalFolder(folder: Folder): Promise<void> {
    if (!folder.storageConfigId) return;
    try {
      const storageConfig = await this.storageService.getConfigById(folder.storageConfigId);
      if (!storageConfig.enableRecycleBin) return;

      const adapter = await this.storageService.getAdapterByConfigId(folder.storageConfigId);
      const recycleBinPath = storageConfig.recycleBinPath || '.RECYCLE.BIN/';
      const folderPath = folder.path.startsWith('/') ? folder.path.substring(1) : folder.path;
      const sourcePath = `${recycleBinPath}${folderPath}`;
      const targetPath = folderPath;
      
      if (typeof (adapter as any).rename === 'function') {
        await (adapter as any).rename(sourcePath, targetPath);
        await this.updateFilePathsInFolderRecursive(folder.id, sourcePath, targetPath, true);
      }
    } catch (error) {
      this.logger.error(`Failed to restore physical folder: ${error.message}`);
      throw new CustomException(ErrorCode.ERR_20001, '恢复物理文件夹失败');
    }
  }

  private async restoreFolderContentsRecursive(folderId: number, userId: number): Promise<void> {
    const files = await this.fileRepo.find({ where: { folderId, userId, isDeleted: true } });
    if (files.length > 0) {
      files.forEach(f => { f.isDeleted = false; f.deletedAt = undefined as any; f.updatedAt = new Date(); });
      await this.fileRepo.save(files);
    }

    const subFolders = await this.folderRepo.find({ where: { parentId: folderId, userId, isDeleted: true } });
    for (const subFolder of subFolders) {
      subFolder.isDeleted = false;
      subFolder.deletedAt = undefined as any;
      subFolder.updatedAt = new Date();
      await this.folderRepo.save(subFolder);
      await this.restoreFolderContentsRecursive(subFolder.id, userId);
    }
  }

  private async updateFilePathsInFolderRecursive(
    folderId: number,
    oldBasePath: string,
    newBasePath: string,
    isDeleted: boolean = true,
  ): Promise<void> {
    const files = await this.fileRepo.find({ where: { folderId, isDeleted } });
    for (const file of files) {
      const newPath = file.path.replace(oldBasePath, newBasePath);
      if (newPath !== file.path) {
        file.path = newPath;
        file.url = `/files/${newPath}`;
        await this.fileRepo.save(file);
      }
    }

    const subFolders = await this.folderRepo.find({ where: { parentId: folderId, isDeleted } });
    for (const subFolder of subFolders) {
      await this.updateFilePathsInFolderRecursive(subFolder.id, oldBasePath, newBasePath, isDeleted);
    }
  }
}
