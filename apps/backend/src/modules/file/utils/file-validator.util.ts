import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';

/**
 * 文件验证工具类
 */
export class FileValidator {
  /**
   * 允许的文件扩展名（白名单）
   */
  private static readonly ALLOWED_EXTENSIONS = [
    // 图片
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico',
    // 文档
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv',
    // 压缩文件
    'zip', 'rar', '7z', 'tar', 'gz',
    // 音频
    'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a',
    // 视频
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm',
    // 代码
    'js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml',
    'java', 'py', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'swift', 'kt',
  ];

  /**
   * 危险文件扩展名（黑名单）
   */
  private static readonly DANGEROUS_EXTENSIONS = [
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'psm1',
    'app', 'deb', 'rpm', 'dmg', 'pkg',
  ];

  /**
   * 最大文件大小（字节）
   * 默认 100MB，可通过环境变量配置
   */
  private static readonly MAX_FILE_SIZE = parseInt(
    process.env.FILE_MAX_SIZE || '104857600', // 100MB
    10,
  );

  /**
   * 验证文件扩展名
   * @param filename 文件名
   * @throws CustomException 如果文件类型不支持
   */
  static validateFileType(filename: string): void {
    const extension = this.getFileExtension(filename).toLowerCase();

    // 检查是否在危险扩展名列表中
    if (this.DANGEROUS_EXTENSIONS.includes(extension)) {
      throw new CustomException(
        ErrorCode.ERR_20103,
        `不支持上传 .${extension} 类型的文件，存在安全风险。`,
      );
    }

    // 检查是否在允许的扩展名列表中
    if (!this.ALLOWED_EXTENSIONS.includes(extension)) {
      throw new CustomException(
        ErrorCode.ERR_20103,
        `不支持的文件类型: .${extension}。支持的类型包括：图片、文档、压缩文件、音视频等。`,
      );
    }
  }

  /**
   * 验证文件大小
   * @param fileSize 文件大小（字节）
   * @throws CustomException 如果文件过大
   */
  static validateFileSize(fileSize: number): void {
    if (fileSize > this.MAX_FILE_SIZE) {
      throw new CustomException(
        ErrorCode.ERR_20102,
        `文件过大（${this.formatBytes(fileSize)}），最大支持 ${this.formatBytes(this.MAX_FILE_SIZE)}。` +
        `建议：压缩文件或分割成多个小文件上传。`,
      );
    }

    if (fileSize === 0) {
      throw new CustomException(
        ErrorCode.ERR_20102,
        '文件大小为 0，无法上传空文件。',
      );
    }
  }

  /**
   * 验证文件名
   * @param filename 文件名
   * @throws CustomException 如果文件名不合法
   */
  static validateFileName(filename: string): void {
    // 检查文件名是否为空
    if (!filename || filename.trim().length === 0) {
      throw new CustomException(
        ErrorCode.ERR_20105,
        '文件名不能为空。',
      );
    }

    // 检查文件名长度
    if (filename.length > 255) {
      throw new CustomException(
        ErrorCode.ERR_20105,
        `文件名过长（${filename.length} 字符），最多支持 255 个字符。`,
      );
    }

    // 检查文件名是否包含非法字符
    const illegalChars = /[<>:"/\\|?*\x00-\x1F]/g;
    if (illegalChars.test(filename)) {
      throw new CustomException(
        ErrorCode.ERR_20105,
        '文件名包含非法字符，不能包含：< > : " / \\ | ? * 等特殊字符。',
      );
    }

    // 检查文件名是否以点开头（隐藏文件）
    if (filename.startsWith('.')) {
      throw new CustomException(
        ErrorCode.ERR_20105,
        '不支持上传隐藏文件（文件名不能以 . 开头）。',
      );
    }
  }

  /**
   * 综合验证文件
   * @param filename 文件名
   * @param fileSize 文件大小（字节）
   */
  static validateFile(filename: string, fileSize: number): void {
    this.validateFileName(filename);
    this.validateFileType(filename);
    this.validateFileSize(fileSize);
  }

  /**
   * 获取文件扩展名
   * @param filename 文件名
   * @returns 扩展名（不含点）
   */
  private static getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
      return '';
    }
    return filename.substring(lastDotIndex + 1);
  }

  /**
   * 格式化字节数
   * @param bytes 字节数
   * @returns 格式化后的字符串
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * 获取最大文件大小
   * @returns 最大文件大小（字节）
   */
  static getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }

  /**
   * 获取允许的文件扩展名列表
   * @returns 扩展名数组
   */
  static getAllowedExtensions(): string[] {
    return [...this.ALLOWED_EXTENSIONS];
  }
}
