import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { MethodType, PermissionType } from '@/types';

/**
 * 创建权限 DTO
 * 用于创建新权限节点时的数据传输
 */
export class CreatePermissionDto {
  /**
   * 权限节点名称
   * 长度: 1-50 字符
   */
  @ApiProperty({
    description: '权限节点名称',
    example: '系统管理',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1, { message: '权限名称长度不能少于1位' })
  @MaxLength(50, { message: '权限名称长度不能超过50位' })
  name: string;

  /**
   * 权限节点唯一标识码
   * 长度: 1-100 字符
   */
  @ApiProperty({
    description: '权限节点唯一标识码',
    example: 'system',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1, { message: '权限编码长度不能少于1位' })
  @MaxLength(100, { message: '权限编码长度不能超过100位' })
  code: string;

  /**
   * 权限节点类型
   * MODULE: 模块（顶层节点）
   * CATALOG: 目录（MODULE 下的分类）
   * MENU: 菜单（CATALOG 下的页面）
   * BUTTON: 按钮（MENU 下的操作）
   * API: API 接口（可挂载在任何节点）
   */
  @ApiProperty({
    description: '权限节点类型',
    enum: ['MODULE', 'CATALOG', 'MENU', 'BUTTON', 'API'],
    example: 'MODULE',
    examples: {
      module: { value: 'MODULE', description: '模块（顶层节点）' },
      catalog: { value: 'CATALOG', description: '目录（MODULE 下的分类）' },
      menu: { value: 'MENU', description: '菜单（CATALOG 下的页面）' },
      button: { value: 'BUTTON', description: '按钮（MENU 下的操作）' },
      api: { value: 'API', description: 'API 接口（可挂载在任何节点）' },
    },
  })
  @IsEnum(['MODULE', 'CATALOG', 'MENU', 'BUTTON', 'API'], {
    message: 'type must be one of: MODULE, CATALOG, MENU, BUTTON, API',
  })
  type: PermissionType;

  /**
   * 父节点 ID
   * MODULE 必须为 null
   * CATALOG 的父节点必须是 MODULE
   * MENU 的父节点必须是 CATALOG
   * BUTTON 的父节点必须是 MENU
   */
  @ApiPropertyOptional({
    description:
      '父节点 ID。MODULE 必须为 null，CATALOG 的父节点必须是 MODULE，MENU 的父节点必须是 CATALOG，BUTTON 的父节点必须是 MENU',
    example: 1,
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  parentId?: number;

  /**
   * 路由路径
   * 仅 MENU 类型需要
   * 长度: 最多200字符
   */
  @ApiPropertyOptional({
    description: '路由路径（仅 MENU 类型需要）',
    example: '/user/list',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '路由路径长度不能超过200位' })
  path?: string;

  /**
   * 重定向路径
   * 长度: 最多200字符
   */
  @ApiPropertyOptional({
    description: '重定向路径',
    example: '/user/list',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '重定向路径长度不能超过200位' })
  redirect?: string;

  /**
   * 图标名称
   * 长度: 最多100字符
   */
  @ApiPropertyOptional({
    description: '图标名称',
    example: 'user-icon',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '图标名称长度不能超过100位' })
  icon?: string;

  /**
   * 组件路径
   * 仅 MENU 类型需要
   * 长度: 最多200字符
   */
  @ApiPropertyOptional({
    description: '组件路径（仅 MENU 类型需要）',
    example: 'UserList',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '组件路径长度不能超过200位' })
  component?: string;

  /**
   * 布局组件
   * 长度: 最多100字符
   */
  @ApiPropertyOptional({
    description: '布局组件',
    example: 'DefaultLayout',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '布局组件长度不能超过100位' })
  layout?: string;

  /**
   * 是否缓存页面
   * 默认: false
   */
  @ApiPropertyOptional({
    description: '是否缓存页面',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  keepAlive?: boolean;

  /**
   * HTTP 方法
   * 仅 API 类型需要
   */
  @ApiPropertyOptional({
    description: 'HTTP 方法（仅 API 类型需要）',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    example: 'GET',
  })
  @IsString()
  @IsOptional()
  method?: MethodType;

  /**
   * 权限节点描述
   * 长度: 最多200字符
   */
  @ApiPropertyOptional({
    description: '权限节点描述',
    example: '系统管理模块',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '权限描述长度不能超过200位' })
  description?: string;

  /**
   * 排序顺序
   * 默认: 0
   */
  @ApiPropertyOptional({
    description: '排序顺序',
    example: 1,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  order?: number;

  /**
   * 是否在菜单中显示
   * 默认: true
   */
  @ApiPropertyOptional({
    description: '是否在菜单中显示',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  show?: boolean;

  /**
   * 是否启用
   * 默认: true
   */
  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  enable?: boolean;
}
