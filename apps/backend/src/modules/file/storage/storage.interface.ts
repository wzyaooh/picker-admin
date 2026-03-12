/**
 * 存储适配器接口
 * 定义统一的文件存储操作接口，支持本地存储和对象存储
 */
export interface StorageAdapter {
  /**
   * 上传文件
   * @param file 文件缓冲区
   * @param filename 文件名
   * @param options 上传选项
   * @returns 文件路径和访问URL
   */
  upload(
    file: Buffer,
    filename: string,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  /**
   * 下载文件
   * @param path 文件路径
   * @returns 文件缓冲区
   */
  download(path: string): Promise<Buffer>;

  /**
   * 删除文件
   * @param path 文件路径
   */
  delete(path: string): Promise<void>;

  /**
   * 检查文件是否存在
   * @param path 文件路径
   */
  exists(path: string): Promise<boolean>;

  /**
   * 获取文件访问URL
   * @param path 文件路径
   * @returns 访问URL
   */
  getUrl(path: string): string;

  /**
   * 创建目录
   * @param path 目录路径
   */
  createDirectory(path: string): Promise<void>;

  /**
   * 重命名文件或目录
   * @param oldPath 旧路径
   * @param newPath 新路径
   */
  rename(oldPath: string, newPath: string): Promise<void>;
}

/**
 * 上传选项
 */
export interface UploadOptions {
  /** 文件夹路径 */
  folder?: string;
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
  /** 内容类型 */
  contentType?: string;
}

/**
 * 上传结果
 */
export interface UploadResult {
  /** 文件存储路径 */
  path: string;
  /** 文件访问URL */
  url: string;
  /** 文件大小（字节） */
  size: number;
}
