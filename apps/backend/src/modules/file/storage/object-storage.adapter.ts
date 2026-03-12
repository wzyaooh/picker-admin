import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { StorageAdapter, UploadOptions, UploadResult } from './storage.interface';

/**
 * 对象存储适配器配置
 */
export interface ObjectStorageConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  useSSL?: boolean;
}

/**
 * 对象存储适配器（支持 MinIO/S3/OSS）
 */
@Injectable()
export class ObjectStorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(ObjectStorageAdapter.name);
  private readonly s3: AWS.S3;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    private config: ObjectStorageConfig,
  ) {
    this.bucket = config.bucket;
    
    // 配置 S3 客户端
    this.s3 = new AWS.S3({
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region || 'us-east-1',
      s3ForcePathStyle: true, // MinIO 需要
      signatureVersion: 'v4',
      sslEnabled: config.useSSL !== false,
    });
    
    // 构建基础URL
    this.baseUrl = config.endpoint.replace(/\/$/, '');
    
    this.logger.log(`Object storage adapter initialized: ${config.endpoint}`);
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
      // 构建对象键
      const folder = options?.folder || '';
      const key = folder ? `${folder}/${filename}` : filename;
      
      // 上传参数
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: options?.contentType || 'application/octet-stream',
      };
      
      // 上传文件
      await this.s3.putObject(params).promise();
      
      // 获取文件URL
      const url = this.getUrl(key);
      
      this.logger.log(`File uploaded to object storage: ${key}`);
      
      return {
        path: key,
        url,
        size: file.length,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file to object storage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 下载文件
   */
  async download(filePath: string): Promise<Buffer> {
    try {
      const params: AWS.S3.GetObjectRequest = {
        Bucket: this.bucket,
        Key: filePath,
      };
      
      const result = await this.s3.getObject(params).promise();
      this.logger.log(`File downloaded from object storage: ${filePath}`);
      
      return result.Body as Buffer;
    } catch (error) {
      this.logger.error(`Failed to download file from object storage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async delete(filePath: string): Promise<void> {
    try {
      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: this.bucket,
        Key: filePath,
      };
      
      await this.s3.deleteObject(params).promise();
      this.logger.log(`File deleted from object storage: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from object storage: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const params: AWS.S3.HeadObjectRequest = {
        Bucket: this.bucket,
        Key: filePath,
      };
      
      await this.s3.headObject(params).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取文件访问URL
   */
  getUrl(filePath: string): string {
    return `${this.baseUrl}/${this.bucket}/${filePath}`;
  }

  /**
   * 创建目录
   * 注意：对象存储（S3/MinIO/OSS）不需要显式创建目录
   * 目录会在上传文件时自动创建
   */
  async createDirectory(dirPath: string): Promise<void> {
    // 对象存储不需要显式创建目录
    // 目录是虚拟的，会在上传文件时自动创建
    this.logger.log(`Directory creation skipped for object storage (virtual): ${dirPath}`);
  }

  /**
   * 重命名文件或目录
   * 注意：对象存储不支持原子重命名操作
   * 需要复制所有对象到新路径，然后删除旧对象
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    this.logger.warn(`Rename operation not fully implemented for object storage: ${oldPath} -> ${newPath}`);
    // TODO: 实现对象存储的重命名
    // 1. 列出所有以 oldPath 为前缀的对象
    // 2. 复制每个对象到新路径
    // 3. 删除旧对象
    // 这是一个耗时操作，建议异步处理
  }

  /**
   * 获取预签名URL（用于临时访问）
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: filePath,
      Expires: expiresIn,
    };
    
    return this.s3.getSignedUrlPromise('getObject', params);
  }
}
