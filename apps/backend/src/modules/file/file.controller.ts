import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  Param,
  Request,
  BadRequestException,
  ParseIntPipe,
  Res,
  StreamableFile,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

import { JwtGuard } from '@/common/guards';
import { Audit } from '@/common/decorators/audit.decorator';

import { FileService } from './file.service';
import { UploadRateLimitGuard } from './guards/upload-rate-limit.guard';
import { FileValidator } from './utils/file-validator.util';
import {
  UploadFileDto,
  QueryFileDto,
  RenameFileDto,
  MoveFileDto,
  CopyFileDto,
  BatchDeleteDto,
  CreateFolderDto,
  AddTagsDto,
} from './dto';

/**
 * 文件管理控制器
 * 提供文件上传、下载、管理、文件夹操作、回收站、收藏等功能
 */
@ApiTags('文件管理')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard)
@Controller('file')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(private readonly fileService: FileService) {}

  /**
   * 上传文件
   * @param file 上传的文件对象
   * @param dto 上传参数（文件夹ID、存储配置ID）
   * @param req 请求对象（包含用户信息）
   * @returns 上传成功的文件信息
   */
  @Post('upload')
  @UseGuards(UploadRateLimitGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '文件',
        },
        folderId: {
          type: 'number',
          description: '文件夹ID（可选）',
        },
      },
    },
  })
  @Audit({ description: '上传文件', saveReqBody: false })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @Request() req: any,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const userId = req.user.userId;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    // 验证文件
    FileValidator.validateFile(file.originalname, file.size);

    // 记录上传日志
    this.logger.log({
      action: 'file_upload_start',
      userId,
      fileName: file.originalname,
      fileSize: file.size,
      folderId: dto.folderId,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    const result = await this.fileService.uploadFile(
      file.buffer,
      file.originalname,
      userId,
      dto.folderId,
      dto.storageConfigId,
    );

    // 记录上传成功日志
    this.logger.log({
      action: 'file_upload_success',
      userId,
      fileId: result.id,
      fileName: result.name,
      fileSize: result.size,
      timestamp: new Date().toISOString(),
    });

    return {
      id: result.id,
      name: result.name,
      size: result.size,
      type: result.mimeType,
      url: result.url,
      md5: result.md5,
    };
  }

  /**
   * 获取文件列表
   * @param query 查询参数（分页、搜索、文件夹ID等）
   * @param req 请求对象（包含用户信息）
   * @returns 文件列表和分页信息
   */
  @Get('list')
  @ApiOperation({ summary: '获取文件列表' })
  async getFileList(@Query() query: QueryFileDto, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    console.log('[FileController.getFileList] 接收到的查询参数:', query);
    console.log('[FileController.getFileList] storageConfigId:', query.storageConfigId);
    const result = await this.fileService.getFileList(userId, query);
    console.log('[FileController.getFileList] 返回结果数量:', result.items?.length, '总数:', result.total);
    return result;
  }

  /**
   * 重命名文件
   * @param id 文件ID
   * @param dto 重命名参数（新文件名）
   * @param req 请求对象（包含用户信息）
   * @returns 更新后的文件信息
   */
  @Patch(':id/rename')
  @ApiOperation({ summary: '重命名文件' })
  @Audit({ description: '重命名文件', saveReqBody: true })
  async renameFile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenameFileDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.renameFile(id, userId, dto.newName);
  }

  /**
   * 删除文件
   * @param id 文件ID
   * @param req 请求对象（包含用户信息）
   * @returns 删除结果
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除文件' })
  @Audit({ description: '删除文件', saveReqBody: false })
  async deleteFile(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.deleteFile(id, userId);
  }

  /**
   * 批量删除文件
   * @param dto 批量删除参数（文件ID数组）
   * @param req 请求对象（包含用户信息）
   * @returns 删除结果
   */
  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除文件' })
  @Audit({ description: '批量删除文件', saveReqBody: true })
  async batchDeleteFiles(@Body() dto: BatchDeleteDto, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.batchDeleteFiles(dto.fileIds, userId);
  }

  /**
   * 移动文件
   * @param id 文件ID
   * @param dto 移动参数（目标文件夹ID）
   * @param req 请求对象（包含用户信息）
   * @returns 移动后的文件信息
   */
  @Patch(':id/move')
  @ApiOperation({ summary: '移动文件' })
  @Audit({ description: '移动文件', saveReqBody: true })
  async moveFile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveFileDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.userId;
    const targetFolderId = dto.targetFolderId ?? null;
    return this.fileService.moveFile(id, userId, targetFolderId);
  }

  /**
   * 复制文件
   * @param id 文件ID
   * @param dto 复制参数（目标文件夹ID）
   * @param req 请求对象（包含用户信息）
   * @returns 复制后的新文件信息
   */
  @Post(':id/copy')
  @ApiOperation({ summary: '复制文件' })
  @Audit({ description: '复制文件', saveReqBody: true })
  async copyFile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CopyFileDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.userId;
    const targetFolderId = dto.targetFolderId ?? null;
    return this.fileService.copyFile(id, userId, targetFolderId);
  }

  /**
   * 创建文件夹
   * @param dto 创建参数（文件夹名称、父文件夹ID、存储配置ID）
   * @param req 请求对象（包含用户信息）
   * @returns 创建的文件夹信息
   */
  @Post('folder')
  @ApiOperation({ summary: '创建文件夹' })
  @Audit({ description: '创建文件夹', saveReqBody: true })
  async createFolder(@Body() dto: CreateFolderDto, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    const parentId = dto.parentId ?? null;
    const storageConfigId = dto.storageConfigId;
    return this.fileService.createFolder(dto.name, userId, parentId, storageConfigId);
  }

  /**
   * 删除文件夹
   * @param id 文件夹ID
   * @param req 请求对象（包含用户信息）
   * @returns 删除结果
   */
  @Delete('folder/:id')
  @ApiOperation({ summary: '删除文件夹' })
  @Audit({ description: '删除文件夹', saveReqBody: false })
  async deleteFolder(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.deleteFolder(id, userId);
  }

  /**
   * 重命名文件夹
   * @param id 文件夹ID
   * @param dto 重命名参数（新文件夹名称）
   * @param req 请求对象（包含用户信息）
   * @returns 更新后的文件夹信息
   */
  @Patch('folder/:id/rename')
  @ApiOperation({ summary: '重命名文件夹' })
  @Audit({ description: '重命名文件夹', saveReqBody: true })
  async renameFolder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenameFileDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.renameFolder(id, userId, dto.newName);
  }

  /**
   * 移动文件夹
   * @param id 文件夹ID
   * @param dto 移动参数（目标父文件夹ID）
   * @param req 请求对象（包含用户信息）
   * @returns 移动后的文件夹信息
   */
  @Patch('folder/:id/move')
  @ApiOperation({ summary: '移动文件夹' })
  @Audit({ description: '移动文件夹', saveReqBody: true })
  async moveFolder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveFileDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.userId;
    const targetParentId = dto.targetFolderId ?? null;
    return this.fileService.moveFolder(id, userId, targetParentId);
  }

  /**
   * 获取文件夹列表
   * @param parentId 父文件夹ID（可选）
   * @param req 请求对象（包含用户信息）
   * @returns 文件夹列表
   */
  @Get('folder/list')
  @ApiOperation({ summary: '获取文件夹列表' })
  async getFolderList(@Query('parentId') parentId: number | null, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.getFolderList(userId, parentId);
  }

  /**
   * 获取文件夹树
   * @param req 请求对象（包含用户信息）
   * @returns 完整的文件夹树结构
   */
  @Get('folder/tree')
  @ApiOperation({ summary: '获取文件夹树' })
  async getFolderTree(@Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.getFolderTree(userId);
  }

  /**
   * 下载文件
   * @param id 文件ID
   * @param req 请求对象（包含用户信息）
   * @param res 响应对象
   * @returns 文件流
   */
  @Get(':id/download')
  @ApiOperation({ summary: '下载文件' })
  async downloadFile(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const userId = req.user.userId;
    const { buffer, file } = await this.fileService.downloadFile(id, userId);

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  /**
   * 获取存储空间统计
   * @param storageConfigId 存储配置ID（可选）
   * @param req 请求对象（包含用户信息）
   * @returns 存储空间使用情况统计
   */
  @Get('stats/storage')
  @ApiOperation({ summary: '获取存储空间统计' })
  async getStorageStats(
    @Query('storageConfigId') storageConfigId: number | undefined,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.getStorageStats(userId, storageConfigId);
  }

  /**
   * 获取分类统计
   * @param storageConfigId 存储配置ID（可选）
   * @param req 请求对象（包含用户信息）
   * @returns 各类文件的数量和大小统计
   */
  @Get('stats/category')
  @ApiOperation({ summary: '获取分类统计' })
  async getCategoryStats(
    @Query('storageConfigId') storageConfigId: number | undefined,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.getCategoryStats(userId, storageConfigId);
  }

  /**
   * 获取回收站列表
   * @param query 查询参数（分页）
   * @param req 请求对象（包含用户信息）
   * @returns 已删除的文件列表
   */
  @Get('recycle-bin')
  @ApiOperation({ summary: '获取回收站列表' })
  async getRecycleBinList(@Query() query: QueryFileDto, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.getRecycleBinList(userId, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  /**
   * 恢复文件
   * @param id 文件ID
   * @param req 请求对象（包含用户信息）
   * @returns 恢复结果
   */
  @Post(':id/restore')
  @ApiOperation({ summary: '恢复文件' })
  @Audit({ description: '恢复文件', saveReqBody: false })
  async restoreFile(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.restoreFile(id, userId);
  }

  /**
   * 永久删除文件（从回收站）
   * @param id 文件ID
   * @param req 请求对象（包含用户信息）
   * @returns 删除结果
   */
  @Delete(':id/permanent')
  @ApiOperation({ summary: '永久删除文件' })
  @Audit({ description: '永久删除文件', saveReqBody: false })
  async permanentlyDeleteFile(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.permanentlyDeleteFile(id, userId);
  }

  /**
   * 彻底删除文件（直接删除）
   * @param id 文件ID
   * @param req 请求对象（包含用户信息）
   * @returns 删除结果
   */
  @Delete(':id/completely')
  @ApiOperation({ summary: '彻底删除文件' })
  @Audit({ description: '彻底删除文件', saveReqBody: false })
  async completelyDeleteFile(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.completelyDeleteFile(id, userId);
  }

  /**
   * 清空回收站
   * @param req 请求对象（包含用户信息）
   * @returns 清空结果
   */
  @Delete('recycle-bin/empty')
  @ApiOperation({ summary: '清空回收站' })
  @Audit({ description: '清空回收站', saveReqBody: false })
  async emptyRecycleBin(@Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.emptyRecycleBin(userId);
  }

  /**
   * 添加标签
   * @param id 文件ID
   * @param dto 标签参数（标签数组）
   * @param req 请求对象（包含用户信息）
   * @returns 更新后的文件信息
   */
  @Post(':id/tags')
  @ApiOperation({ summary: '添加标签' })
  @Audit({ description: '添加标签', saveReqBody: true })
  async addTags(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddTagsDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.addTags(id, userId, dto.tags);
  }

  /**
   * 移除标签
   * @param id 文件ID
   * @param dto 标签参数（标签数组）
   * @param req 请求对象（包含用户信息）
   * @returns 更新后的文件信息
   */
  @Delete(':id/tags')
  @ApiOperation({ summary: '移除标签' })
  @Audit({ description: '移除标签', saveReqBody: true })
  async removeTags(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddTagsDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.removeTags(id, userId, dto.tags);
  }

  /**
   * 按标签查询文件
   * @param tags 标签字符串（逗号分隔）
   * @param query 查询参数（分页）
   * @param req 请求对象（包含用户信息）
   * @returns 包含指定标签的文件列表
   */
  @Get('tags/search')
  @ApiOperation({ summary: '按标签查询文件' })
  async getFilesByTags(
    @Query('tags') tags: string,
    @Query() query: QueryFileDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.userId;
    const tagArray = tags.split(',').map((tag) => tag.trim());
    return this.fileService.getFilesByTags(userId, tagArray, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  /**
   * 切换收藏状态
   * @param id 文件ID
   * @param req 请求对象（包含用户信息）
   * @returns 更新后的收藏状态
   */
  @Post(':id/favorite')
  @ApiOperation({ summary: '切换收藏状态' })
  @Audit({ description: '切换收藏状态', saveReqBody: false })
  async toggleFavorite(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.toggleFavorite(id, userId);
  }

  /**
   * 获取收藏列表
   * @param query 查询参数（分页）
   * @param req 请求对象（包含用户信息）
   * @returns 用户收藏的文件列表
   */
  @Get('favorites')
  @ApiOperation({ summary: '获取收藏列表' })
  async getFavoriteList(@Query() query: QueryFileDto, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.getFavoriteList(userId, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  /**
   * 恢复文件夹（从回收站）
   * @param id 文件夹ID
   * @param req 请求对象（包含用户信息）
   * @returns 恢复结果
   */
  @Post('folder/:id/restore')
  @ApiOperation({ summary: '恢复文件夹' })
  @Audit({ description: '恢复文件夹', saveReqBody: false })
  async restoreFolder(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.restoreFolder(id, userId);
  }

  /**
   * 永久删除文件夹（从回收站）
   * @param id 文件夹ID
   * @param req 请求对象（包含用户信息）
   * @returns 删除结果
   */
  @Delete('folder/:id/permanent')
  @ApiOperation({ summary: '永久删除文件夹' })
  @Audit({ description: '永久删除文件夹', saveReqBody: false })
  async permanentlyDeleteFolder(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<any> {
    const userId = req.user.userId;
    return this.fileService.permanentlyDeleteFolder(id, userId);
  }
}
