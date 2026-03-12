import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { calculateMD5, generateUniqueFilename, getFileExtension, getMimeType } from '../utils/file.util';
import {
  checkDuplicateFileName,
  checkDuplicateFolderName,
  findFileOrFail,
  findFolderOrFail,
  validateTargetFolder,
} from '../file.helper';
import { File, Folder } from '../entities';
import { StorageService } from '../storage/storage.service';
import { FilePermissionService } from './file-permission.service';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
    @InjectRepository(Folder)
    private readonly folderRepo: Repository<Folder>,
    private readonly storageService: StorageService,
    private readonly permissionService: FilePermissionService,
  ) {}

  /**
   * 上传文件
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    userId: number,
    folderId?: number,
    storageConfigId?: number,
  ): Promise<File> {
    try {
      const md5 = calculateMD5(buffer);

      // 检查存储配额
      await this.permissionService.checkStorageQuota(userId, buffer.length);

      const adapter = storageConfigId 
        ? await this.storageService.getAdapterByConfigId(storageConfigId)
        : await this.storageService.getDefaultAdapter();

      if (!storageConfigId) {
        const defaultConfig = await this.storageService.getDefaultConfig();
        storageConfigId = defaultConfig.id;
      }

      const uniqueFilename = generateUniqueFilename(originalName);
      const extension = getFileExtension(originalName);
      const mimeType = getMimeType(extension);

      let folderPath = '';
      if (folderId) {
        const folder = await this.folderRepo.findOne({
          where: { id: folderId, userId, isDeleted: false },
        });
        if (folder) {
          folderPath = folder.path.startsWith('/') ? folder.path.substring(1) : folder.path;
        }
      }

      const uploadResult = await adapter.upload(buffer, uniqueFilename, {
        folder: folderPath,
        contentType: mimeType,
      });

      const file = this.fileRepo.create({
        name: originalName,
        originalName,
        size: buffer.length,
        mimeType,
        extension,
        path: uploadResult.path,
        url: uploadResult.url,
        storageConfigId,
        storageType: 'local',
        folderId: folderId || undefined,
        userId,
        md5,
        isFolder: false,
        isDeleted: false,
        isFavorite: false,
        tags: [],
        version: 1,
      });

      const savedFile = await this.fileRepo.save(file);

      // 更新存储配额
      await this.permissionService.updateStorageQuota(userId, buffer.length, 1, 0);

      return savedFile;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建文件夹
   */
  async createFolder(
    name: string,
    userId: number,
    parentId: number | null,
    storageConfigId?: number,
  ): Promise<Folder> {
    await checkDuplicateFolderName(this.folderRepo, name, parentId, userId);

    if (!storageConfigId) {
      if (parentId !== null) {
        const parentFolder = await findFolderOrFail(this.folderRepo, parentId, userId);
        storageConfigId = parentFolder.storageConfigId;
      } else {
        const defaultConfig = await this.storageService.getDefaultConfig();
        storageConfigId = defaultConfig.id;
      }
    }

    let dbPath = `/${name}`;
    if (parentId !== null) {
      const parentFolder = await findFolderOrFail(this.folderRepo, parentId, userId);
      dbPath = `${parentFolder.path}/${name}`;
    }

    const adapter = await this.storageService.getAdapterByConfigId(storageConfigId!);
    const physicalPath = dbPath.startsWith('/') ? dbPath.substring(1) : dbPath;
    
    try {
      await adapter.createDirectory(physicalPath);
    } catch (error) {
      this.logger.error(`Failed to create physical directory: ${error.message}`);
      throw new CustomException(ErrorCode.ERR_20001, '创建文件夹失败');
    }

    const folder = this.folderRepo.create({
      name,
      parentId: parentId ?? undefined,
      userId,
      path: dbPath,
      storageConfigId,
      isDeleted: false,
    });

    const savedFolder = await this.folderRepo.save(folder);
    await this.permissionService.updateStorageQuota(userId, 0, 0, 1);

    return savedFolder;
  }

  /**
   * 复制文件
   */
  async copyFile(
    fileId: number,
    userId: number,
    targetFolderId: number | null,
  ): Promise<File> {
    const sourceFile = await findFileOrFail(this.fileRepo, fileId, userId);
    await validateTargetFolder(this.folderRepo, targetFolderId, userId);

    let newName = sourceFile.name;
    const existingFile = await this.fileRepo.findOne({
      where: {
        name: newName,
        folderId: targetFolderId === null ? IsNull() : targetFolderId,
        userId,
        isDeleted: false,
      },
    });

    if (existingFile) {
      const extension = getFileExtension(newName);
      const nameWithoutExt = newName.substring(0, newName.lastIndexOf('.'));
      newName = `${nameWithoutExt} (副本).${extension}`;
    }

    const adapter = await this.storageService.getDefaultAdapter();
    const buffer = await adapter.download(sourceFile.path);

    let targetFolderPath = '';
    if (targetFolderId !== null) {
      const targetFolder = await this.folderRepo.findOne({
        where: { id: targetFolderId, userId, isDeleted: false },
      });
      if (targetFolder) {
        targetFolderPath = targetFolder.path.startsWith('/') ? targetFolder.path.substring(1) : targetFolder.path;
      }
    }

    const uniqueFilename = generateUniqueFilename(newName);
    const uploadResult = await adapter.upload(buffer, uniqueFilename, {
      folder: targetFolderPath,
      contentType: sourceFile.mimeType,
    });

    const newFile = this.fileRepo.create({
      ...sourceFile,
      id: undefined,
      name: newName,
      path: uploadResult.path,
      url: uploadResult.url,
      folderId: targetFolderId === null ? undefined : targetFolderId,
      md5: calculateMD5(buffer),
      isDeleted: false,
      isFavorite: false,
      version: 1,
      createdAt: undefined,
      updatedAt: undefined,
    });

    const savedFile = await this.fileRepo.save(newFile);
    await this.permissionService.updateStorageQuota(userId, sourceFile.size, 1, 0);

    return savedFile;
  }

  /**
   * 重命名文件
   */
  async renameFile(fileId: number, userId: number, newName: string): Promise<File> {
    const file = await findFileOrFail(this.fileRepo, fileId, userId);
    await checkDuplicateFileName(this.fileRepo, newName, file.folderId, userId, fileId);

    file.name = newName;
    file.updatedAt = new Date();
    return this.fileRepo.save(file);
  }

  /**
   * 移动文件
   */
  async moveFile(fileId: number, userId: number, targetFolderId: number | null): Promise<File> {
    const file = await findFileOrFail(this.fileRepo, fileId, userId);
    await validateTargetFolder(this.folderRepo, targetFolderId, userId);
    await checkDuplicateFileName(this.fileRepo, file.name, targetFolderId, userId, fileId);

    const oldPath = file.path;
    let targetFolderPath = '';
    if (targetFolderId !== null) {
      const targetFolder = await this.folderRepo.findOne({
        where: { id: targetFolderId, userId, isDeleted: false },
      });
      if (targetFolder) {
        targetFolderPath = targetFolder.path.startsWith('/') ? targetFolder.path.substring(1) : targetFolder.path;
      }
    }

    const fileName = file.path.split('/').pop() || file.name;
    const newPath = targetFolderPath ? `${targetFolderPath}/${fileName}` : fileName;

    try {
      const adapter = await this.storageService.getAdapterByConfigId(file.storageConfigId);
      if (typeof (adapter as any).rename === 'function') {
        await (adapter as any).rename(oldPath, newPath);
      }
    } catch (error) {
      this.logger.error(`Failed to move physical file: ${error.message}`);
      throw new CustomException(ErrorCode.ERR_20001, '移动物理文件失败');
    }

    file.folderId = targetFolderId === null ? undefined : targetFolderId;
    file.path = newPath;
    file.url = `/files/${newPath}`;
    file.updatedAt = new Date();

    return this.fileRepo.save(file);
  }

  /**
   * 重命名文件夹
   */
  async renameFolder(folderId: number, userId: number, newName: string): Promise<Folder> {
    const folder = await findFolderOrFail(this.folderRepo, folderId, userId);
    await checkDuplicateFolderName(this.folderRepo, newName, folder.parentId, userId, folderId);

    const oldPath = folder.path;
    let newPath: string;
    if (folder.parentId == null) {
      newPath = `/${newName}`;
    } else {
      const parentFolder = await this.folderRepo.findOne({ where: { id: folder.parentId } });
      newPath = `${parentFolder?.path || ''}/${newName}`;
    }

    folder.name = newName;
    folder.path = newPath;
    folder.updatedAt = new Date();

    const savedFolder = await this.folderRepo.save(folder);

    try {
      const adapter = await this.storageService.getDefaultAdapter();
      const oldPhysicalPath = oldPath.startsWith('/') ? oldPath.substring(1) : oldPath;
      const newPhysicalPath = newPath.startsWith('/') ? newPath.substring(1) : newPath;
      await adapter.rename(oldPhysicalPath, newPhysicalPath);
    } catch (error) {
      this.logger.error(`Physical folder rename failed: ${error.message}`);
    }

    await this.updateChildFolderPaths(folderId, oldPath, newPath);
    await this.updateFilesPathInFolder(folderId, oldPath, newPath);

    return savedFolder;
  }

  /**
   * 移动文件夹
   */
  async moveFolder(folderId: number, userId: number, targetParentId: number | null): Promise<Folder> {
    const folder = await findFolderOrFail(this.folderRepo, folderId, userId);

    if (targetParentId !== null) {
      const targetParent = await this.folderRepo.findOne({
        where: { id: targetParentId, userId, isDeleted: false },
      });
      if (!targetParent) throw new CustomException(ErrorCode.ERR_20002, '目标文件夹不存在');
      if (targetParentId === folderId) throw new CustomException(ErrorCode.ERR_20001, '不能将文件夹移动到自身');
      if (await this.isDescendantFolder(folderId, targetParentId)) {
        throw new CustomException(ErrorCode.ERR_20001, '不能将文件夹移动到其子文件夹中');
      }
    }

    await checkDuplicateFolderName(this.folderRepo, folder.name, targetParentId, userId, folderId);

    const oldPath = folder.path;
    let newPath: string;
    if (targetParentId === null) {
      newPath = `/${folder.name}`;
    } else {
      const targetParent = await this.folderRepo.findOne({ where: { id: targetParentId } });
      newPath = `${targetParent?.path || ''}/${folder.name}`;
    }

    try {
      const adapter = await this.storageService.getAdapterByConfigId(folder.storageConfigId || 1);
      const oldPhysicalPath = oldPath.startsWith('/') ? oldPath.substring(1) : oldPath;
      const newPhysicalPath = newPath.startsWith('/') ? newPath.substring(1) : newPath;
      if (typeof (adapter as any).rename === 'function') {
        await (adapter as any).rename(oldPhysicalPath, newPhysicalPath);
      }
    } catch (error) {
      this.logger.error(`Failed to move physical folder: ${error.message}`);
      throw new CustomException(ErrorCode.ERR_20001, '移动物理文件夹失败');
    }

    folder.parentId = targetParentId === null ? undefined : targetParentId;
    folder.path = newPath;
    folder.updatedAt = new Date();

    const savedFolder = await this.folderRepo.save(folder);
    await this.updateChildFolderPaths(folderId, oldPath, newPath);
    await this.updateFilesPathInFolder(folderId, oldPath, newPath);

    return savedFolder;
  }

  private async updateChildFolderPaths(parentId: number, oldParentPath: string, newParentPath: string): Promise<void> {
    const childFolders = await this.folderRepo.find({ where: { parentId, isDeleted: false } });
    for (const child of childFolders) {
      const newPath = child.path.replace(oldParentPath, newParentPath);
      child.path = newPath;
      child.updatedAt = new Date();
      await this.folderRepo.save(child);
      await this.updateChildFolderPaths(child.id, child.path.replace(newParentPath, oldParentPath), newPath);
    }
  }

  private async updateFilesPathInFolder(folderId: number, oldFolderPath: string, newFolderPath: string): Promise<void> {
    const files = await this.fileRepo.find({ where: { folderId, isDeleted: false } });
    const oldPhysicalPath = oldFolderPath.startsWith('/') ? oldFolderPath.substring(1) : oldFolderPath;
    const newPhysicalPath = newFolderPath.startsWith('/') ? newFolderPath.substring(1) : newFolderPath;
    
    for (const file of files) {
      const newFilePath = file.path.replace(oldPhysicalPath, newPhysicalPath);
      if (newFilePath !== file.path) {
        file.path = newFilePath;
        file.url = `/files/${newFilePath}`;
        file.updatedAt = new Date();
        await this.fileRepo.save(file);
      }
    }

    const childFolders = await this.folderRepo.find({ where: { parentId: folderId, isDeleted: false } });
    for (const childFolder of childFolders) {
      await this.updateFilesPathInFolder(childFolder.id, oldFolderPath, newFolderPath);
    }
  }

  private async isDescendantFolder(ancestorId: number, descendantId: number): Promise<boolean> {
    let currentId: number | null | undefined = descendantId;
    while (currentId != null) {
      if (currentId === ancestorId) return true;
      const folder = await this.folderRepo.findOne({ where: { id: currentId } });
      if (!folder) break;
      currentId = folder.parentId;
    }
    return false;
  }
}
