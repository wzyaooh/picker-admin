import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * 创建菜单 DTO
 *
 * 用于创建新的菜单项
 * 支持四种类型：MODULE（模块）、CATALOG（目录）、MENU（菜单）、BUTTON（按钮）
 */
export class CreateMenuDto {
  /**
   * 模块编码
   *
   * 菜单所属的模块编码
   *
   * @minLength 1
   * @maxLength 50
   */
  @ApiProperty({
    description: '模块编码',
    example: 'SYSTEM_MANAGEMENT',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  moduleCode: string;

  /**
   * 父级ID
   *
   * 菜单的父级节点ID
   * - MODULE 的父级必须是 null（顶层节点）
   * - CATALOG 的父级必须是 MODULE
   * - MENU 的父级必须是 CATALOG
   * - BUTTON 的父级必须是 MENU
   */
  @ApiPropertyOptional({
    description: '父级 ID（CATALOG 的父级必须是 MODULE，MENU 的父级必须是 CATALOG，BUTTON 的父级必须是 MENU）',
    example: 1,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  parentId?: number;

  /**
   * 显示名称
   *
   * 菜单在界面上显示的名称
   *
   * @minLength 1
   * @maxLength 50
   */
  @ApiProperty({
    description: '显示名称',
    example: '用户管理',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  /**
   * 菜单类型
   *
   * - MODULE: 模块（顶层节点）
   * - CATALOG: 目录（MODULE 下的分类）
   * - MENU: 菜单（CATALOG 下的页面）
   * - BUTTON: 按钮（MENU 下的操作）
   */
  @ApiProperty({
    description: '菜单类型',
    enum: ['MODULE', 'CATALOG', 'MENU', 'BUTTON'],
    example: 'MENU',
    examples: {
      module: { value: 'MODULE', description: '模块（顶层节点）' },
      catalog: { value: 'CATALOG', description: '目录（MODULE 下的分类）' },
      menu: { value: 'MENU', description: '菜单（CATALOG 下的页面）' },
      button: { value: 'BUTTON', description: '按钮（MENU 下的操作）' },
    },
  })
  @IsEnum(['MODULE', 'CATALOG', 'MENU', 'BUTTON'], {
    message: 'type must be one of: MODULE, CATALOG, MENU, BUTTON',
  })
  type: 'MODULE' | 'CATALOG' | 'MENU' | 'BUTTON';

  /**
   * 路由地址
   *
   * 前端路由路径（CATALOG 和 MENU 类型需要）
   * 必须以 / 开头，只能包含小写字母、数字、连字符和斜杠
   *
   * @maxLength 200
   */
  @ApiPropertyOptional({
    description: '路由地址（CATALOG 和 MENU 类型需要）',
    example: '/user/list',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^\/[a-z0-9-/]*$/, {
    message: '路由地址格式不正确，必须以 / 开头，只能包含小写字母、数字、连字符和斜杠',
  })
  path?: string;

  /**
   * 图标名称
   *
   * 菜单显示的图标标识
   *
   * @maxLength 50
   */
  @ApiPropertyOptional({
    description: '图标名称',
    example: 'user-icon',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  /**
   * 组件路径
   *
   * 前端组件的路径或名称（MENU 类型需要）
   *
   * @maxLength 200
   */
  @ApiPropertyOptional({
    description: '组件路径（MENU 类型需要）',
    example: 'UserList',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  component?: string;

  /**
   * 权限标识
   *
   * 唯一的权限标识码，用于权限控制
   *
   * @minLength 1
   * @maxLength 100
   */
  @ApiProperty({
    description: '权限标识（唯一）',
    example: 'system:user:list',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  code: string;

  /**
   * 是否隐藏
   *
   * 控制菜单是否在界面上显示
   *
   * @default false
   */
  @ApiPropertyOptional({
    description: '是否隐藏',
    example: false,
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hidden?: boolean;

  /**
   * 是否启用
   *
   * 控制菜单是否可用
   *
   * @default true
   */
  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enable?: boolean;

  /**
   * 排序顺序
   *
   * 用于控制菜单的显示顺序，值越小越靠前
   *
   * @default 999
   * @minimum 0
   */
  @ApiPropertyOptional({
    description: '排序顺序',
    example: 1,
    minimum: 0,
    default: 999,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  order?: number;
}
