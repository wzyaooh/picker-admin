import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageAdapter, UploadOptions, UploadResult } from './storage.interface';

/**
 * 本地文件系统存储适配器
 */
@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    uploadDir?: string, // 可选的上传目录参数，用于支持多存储配置
  ) {
    // 优先使用传入的 uploadDir，否则使用环境变量
    this.uploadDir = uploadDir || this.configService.get<string>('FILE_UPLOAD_DIR', './uploads');
    this.baseUrl = this.configService.get<string>('FILE_BASE_URL', 'http://localhost:5320');
    
    this.logger.log(`LocalStorageAdapter initialized with uploadDir: ${this.uploadDir}`);
    
    // 确保上传目录存在
    this.ensureUploadDir();
  }

  /**
   * 确保上传目录存在
   */
  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * 上传文件
   */
  async upload(
    file: Buffer,
    filename: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    try {
      // 构建文件路径
      const folder = options?.folder || '';
      this.logger.log(`Upload - filename: ${filename}, folder: "${folder}"`);
      
      const fullPath = folder ? path.join(this.uploadDir, folder) : this.uploadDir;
      this.logger.log(`Upload - fullPath: ${fullPath}`);
      
      // 确保文件夹存在
      await fs.mkdir(fullPath, { recursive: true });
      
      // 完整文件路径
      const filePath = path.join(fullPath, filename);
      this.logger.log(`Upload - filePath: ${filePath}`);
      
      // 检查文件是否已存在
      if (!options?.overwrite) {
        try {
          await fs.access(filePath);
          throw new Error(`File already exists: ${filename}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }
      
      // 写入文件
      await fs.writeFile(filePath, file);
      
      // 获取文件大小
      const stats = await fs.stat(filePath);
      
      // 构建相对路径和URL
      const relativePath = folder ? path.join(folder, filename) : filename;
      const url = this.getUrl(relativePath);
      
      this.logger.log(`File uploaded successfully: ${relativePath}`);
      
      return {
        path: relativePath,
        url,
        size: stats.size,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 下载文件
   */
  async download(filePath: string): Promise<Buffer> {
    try {
      this.logger.log(`=== Download Operation Start ===`);
      this.logger.log(`File path: "${filePath}"`);
      this.logger.log(`Upload dir: "${this.uploadDir}"`);
      
      const fullPath = path.join(this.uploadDir, filePath);
      this.logger.log(`Full path: "${fullPath}"`);
      
      // 检查文件是否存在
      try {
        const stats = await fs.stat(fullPath);
        this.logger.log(`File exists: ${fullPath}`);
        this.logger.log(`File size: ${stats.size} bytes`);
        this.logger.log(`Is file: ${stats.isFile()}`);
        this.logger.log(`File permissions: ${stats.mode.toString(8)}`);
      } catch (error) {
        this.logger.error(`File does not exist: ${fullPath}`);
        this.logger.error(`Error: ${error.message}`);
        throw new Error(`File not found: ${filePath}`);
      }
      
      const buffer = await fs.readFile(fullPath);
      this.logger.log(`✅ File read successfully, buffer size: ${buffer.length} bytes`);
      this.logger.log(`=== Download Operation End ===`);
      return buffer;
    } catch (error) {
      this.logger.error(`❌ Failed to download file: ${error.message}`, error.stack);
      this.logger.error(`File path: ${filePath}`);
      this.logger.error(`Full path: ${path.join(this.uploadDir, filePath)}`);
      this.logger.error(`=== Download Operation End (Error) ===`);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async delete(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await fs.unlink(fullPath);
      this.logger.log(`File deleted: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件访问URL
   */
  getUrl(filePath: string): string {
    // 返回相对路径，让前端通过代理访问
    // 这样可以避免跨域问题，并且适配不同的部署环境
    return `/files/${filePath}`;
  }

  /**
   * 创建目录
   */
  async createDirectory(dirPath: string): Promise<void> {
    try {
      const fullPath = path.join(this.uploadDir, dirPath);
      await fs.mkdir(fullPath, { recursive: true });
      this.logger.log(`Directory created: ${dirPath}`);
    } catch (error) {
      this.logger.error(`Failed to create directory: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除目录（递归删除）
   */
  async deleteDirectory(dirPath: string): Promise<void> {
    try {
      this.logger.log(`=== Delete Directory Operation Start ===`);
      this.logger.log(`Directory path: "${dirPath}"`);
      this.logger.log(`Upload dir: "${this.uploadDir}"`);
      
      const fullPath = path.join(this.uploadDir, dirPath);
      this.logger.log(`Full path: "${fullPath}"`);
      
      // 检查目录是否存在
      try {
        const stats = await fs.stat(fullPath);
        this.logger.log(`Directory exists: ${fullPath}`);
        this.logger.log(`Is directory: ${stats.isDirectory()}`);
        
        if (!stats.isDirectory()) {
          this.logger.error(`Path is not a directory: ${fullPath}`);
          throw new Error(`Path is not a directory: ${dirPath}`);
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          this.logger.warn(`Directory does not exist, skipping: ${fullPath}`);
          return; // 目录不存在，直接返回
        }
        throw error;
      }
      
      // 递归删除目录及其所有内容
      this.logger.log(`Executing fs.rm with recursive option...`);
      await fs.rm(fullPath, { recursive: true, force: true });
      
      // 验证删除是否成功
      try {
        await fs.access(fullPath);
        this.logger.error(`❌ Verification failed: Directory still exists: ${fullPath}`);
        throw new Error(`Failed to delete directory: ${dirPath}`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          this.logger.log(`✅ Verification: Directory successfully deleted: ${fullPath}`);
        } else {
          throw error;
        }
      }
      
      this.logger.log(`✅ Directory deleted successfully: ${dirPath}`);
      this.logger.log(`=== Delete Directory Operation End ===`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete directory: ${error.message}`, error.stack);
      this.logger.error(`Directory path: ${dirPath}`);
      this.logger.error(`Full path: ${path.join(this.uploadDir, dirPath)}`);
      this.logger.error(`=== Delete Directory Operation End (Error) ===`);
      throw error;
    }
  }

  /**
   * 重命名文件或目录
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    try {
      this.logger.log(`=== Rename Operation Start ===`);
      this.logger.log(`Old path: "${oldPath}"`);
      this.logger.log(`New path: "${newPath}"`);
      this.logger.log(`Upload dir: "${this.uploadDir}"`);
      
      const oldFullPath = path.join(this.uploadDir, oldPath);
      const newFullPath = path.join(this.uploadDir, newPath);
      
      this.logger.log(`Old full path: "${oldFullPath}"`);
      this.logger.log(`New full path: "${newFullPath}"`);
      
      // 检查源路径是否存在
      let isDirectory = false;
      try {
        const stats = await fs.stat(oldFullPath);
        isDirectory = stats.isDirectory();
        this.logger.log(`Source path exists: ${oldFullPath}`);
        this.logger.log(`Source is directory: ${isDirectory}`);
        this.logger.log(`Source permissions: ${stats.mode.toString(8)}`);
      } catch (error) {
        this.logger.error(`Source path does not exist: ${oldPath}`);
        this.logger.error(`Full path checked: ${oldFullPath}`);
        this.logger.error(`Error: ${error.message}`);
        // 如果源路径不存在，不抛出错误，只记录警告
        this.logger.warn(`⚠️ Skipping rename because source does not exist`);
        return;
      }
      
      // 检查目标路径是否已存在
      try {
        await fs.access(newFullPath);
        this.logger.warn(`⚠️ Target path already exists: ${newFullPath}`);
        
        // 如果目标已存在，先删除旧的源路径
        if (isDirectory) {
          this.logger.log(`Removing old source directory: ${oldFullPath}`);
          await fs.rm(oldFullPath, { recursive: true, force: true });
        } else {
          this.logger.log(`Removing old source file: ${oldFullPath}`);
          await fs.unlink(oldFullPath);
        }
        
        this.logger.log(`✅ Target already exists, removed source: ${oldPath}`);
        this.logger.log(`=== Rename Operation End (Target Exists) ===`);
        return;
      } catch {
        // 目标不存在，继续执行重命名
      }
      
      // 确保目标路径的父目录存在
      const newDir = path.dirname(newFullPath);
      this.logger.log(`Creating parent directory: ${newDir}`);
      await fs.mkdir(newDir, { recursive: true });
      
      // 对于目录，使用复制+删除的方式（更可靠）
      if (isDirectory) {
        this.logger.log(`Using copy+delete strategy for directory...`);
        
        try {
          // 递归复制目录
          await this.copyDirectory(oldFullPath, newFullPath);
          this.logger.log(`✅ Directory copied successfully`);
          
          // 删除源目录
          await fs.rm(oldFullPath, { recursive: true, force: true });
          this.logger.log(`✅ Source directory removed`);
        } catch (copyError) {
          this.logger.error(`Copy+delete failed, trying fs.rename: ${copyError.message}`);
          // 如果复制失败，尝试使用 rename
          await fs.rename(oldFullPath, newFullPath);
        }
      } else {
        // 对于文件，直接使用 rename
        this.logger.log(`Executing fs.rename for file...`);
        await fs.rename(oldFullPath, newFullPath);
      }
      
      // 验证重命名是否成功
      try {
        await fs.access(newFullPath);
        this.logger.log(`✅ Verification: New path exists: ${newFullPath}`);
      } catch {
        this.logger.error(`❌ Verification failed: New path does not exist: ${newFullPath}`);
        throw new Error(`Rename verification failed: new path does not exist`);
      }
      
      try {
        await fs.access(oldFullPath);
        this.logger.warn(`⚠️ Warning: Old path still exists: ${oldFullPath}`);
        // 尝试再次删除
        if (isDirectory) {
          await fs.rm(oldFullPath, { recursive: true, force: true });
        } else {
          await fs.unlink(oldFullPath);
        }
        this.logger.log(`✅ Removed remaining old path`);
      } catch {
        this.logger.log(`✅ Verification: Old path removed: ${oldFullPath}`);
      }
      
      this.logger.log(`✅ Renamed successfully: ${oldPath} -> ${newPath}`);
      this.logger.log(`=== Rename Operation End ===`);
    } catch (error) {
      this.logger.error(`❌ Failed to rename: ${error.message}`, error.stack);
      this.logger.error(`Old path: ${oldPath}`);
      this.logger.error(`New path: ${newPath}`);
      this.logger.error(`=== Rename Operation End (Error) ===`);
      throw error;
    }
  }

  /**
   * 递归复制目录
   * @param src 源目录
   * @param dest 目标目录
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    // 创建目标目录
    await fs.mkdir(dest, { recursive: true });
    
    // 读取源目录内容
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    // 复制每个条目
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        // 递归复制子目录
        await this.copyDirectory(srcPath, destPath);
      } else {
        // 复制文件
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}
