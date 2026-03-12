/**
 * 文件管理辅助函数
 * 用于消除重复的查询和验证逻辑
 */
import { Repository } from 'typeorm';
import { File, Folder } from './entities';
import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';

/**
 * 查找文件并验证（未删除）
 */
export async function findFileOrFail(
  fileRepo: Repository<File>,
  fileId: number,
  userId: number,
  isDeleted = false,
): Promise<File> {
  const file = await fileRepo.findOne({
    where: { id: fileId, userId, isDeleted },
  });

  if (!file) {
    throw new CustomException(
      ErrorCode.ERR_20002,
      isDeleted ? '文件不存在或未在回收站中' : '文件不存在'
    );
  }

  return file;
}

/**
 * 查找文件夹并验证（未删除）
 */
export async function findFolderOrFail(
  folderRepo: Repository<Folder>,
  folderId: number,
  userId: number,
): Promise<Folder> {
  const folder = await folderRepo.findOne({
    where: { id: folderId, userId, isDeleted: false },
  });

  if (!folder) {
    throw new CustomException(ErrorCode.ERR_20002, '文件夹不存在');
  }

  return folder;
}

/**
 * 检查同名文件是否存在
 */
export async function checkDuplicateFileName(
  fileRepo: Repository<File>,
  name: string,
  folderId: number | null | undefined,
  userId: number,
  excludeFileId?: number,
): Promise<void> {
  const whereCondition: any = {
    name,
    userId,
    isDeleted: false,
  };

  // 处理 folderId
  if (folderId === null || folderId === undefined) {
    whereCondition.folderId = null;
  } else {
    whereCondition.folderId = folderId;
  }

  const existingFile = await fileRepo.findOne({ where: whereCondition });

  if (existingFile && (!excludeFileId || existingFile.id !== excludeFileId)) {
    throw new CustomException(ErrorCode.ERR_20001, '文件名已存在');
  }
}

/**
 * 检查同名文件夹是否存在
 */
export async function checkDuplicateFolderName(
  folderRepo: Repository<Folder>,
  name: string,
  parentId: number | null | undefined,
  userId: number,
  excludeFolderId?: number,
): Promise<void> {
  const whereCondition: any = {
    name,
    userId,
    isDeleted: false,
  };

  // 处理 parentId
  if (parentId === null || parentId === undefined) {
    whereCondition.parentId = null;
  } else {
    whereCondition.parentId = parentId;
  }

  const existingFolder = await folderRepo.findOne({ where: whereCondition });

  if (existingFolder && (!excludeFolderId || existingFolder.id !== excludeFolderId)) {
    throw new CustomException(ErrorCode.ERR_20001, '文件夹名称已存在');
  }
}

/**
 * 验证目标文件夹是否存在
 */
export async function validateTargetFolder(
  folderRepo: Repository<Folder>,
  targetFolderId: number | null,
  userId: number,
): Promise<Folder | null> {
  if (targetFolderId === null) {
    return null;
  }

  return findFolderOrFail(folderRepo, targetFolderId, userId);
}
