// 第三方库
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

// 项目内部模块
import { JwtGuard, PreviewGuard, RoleGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';

// 相对路径导入
import { UserService } from './user.service';
import { CreateUserDto, GetUserDto, UpdateProfileDto, UpdateUserDto } from './dto';

/**
 * 用户控制器
 * 提供用户管理相关的 HTTP 接口，包括用户的增删改查、个人资料管理等功能
 */
@ApiTags('用户')
@ApiBearerAuth('bearer')
@UseGuards(JwtGuard, RoleGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 创建用户
   * @param user 创建用户数据传输对象
   * @returns 创建的用户信息
   */
  @Post()
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '创建新用户', saveReqBody: true })
  @ApiOperation({ summary: '创建新用户' })
  addUser(@Body() user: CreateUserDto) {
    return this.userService.create(user);
  }

  /**
   * 查询用户列表
   * @param queryDto 查询参数（分页、筛选条件等）
   * @returns 用户列表和分页信息
   */
  @Get()
  @Audit({ description: '查询用户列表' })
  @ApiOperation({ summary: '查询用户列表' })
  getAllUsers(@Query() queryDto: GetUserDto) {
    return this.userService.findAll(queryDto);
  }

  /**
   * 删除用户
   * @param id 用户ID
   * @param req 请求对象（包含当前用户信息）
   * @returns 删除结果
   * @throws CustomException 当尝试删除自己的账号时抛出异常
   */
  @Delete(':id')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '删除用户' })
  @ApiOperation({ summary: '删除用户' })
  deleteUser(@Param('id') id: number, @Request() req: any) {
    const currentUser = req.user;
    if (currentUser.id === +id) {
      throw new CustomException(ErrorCode.ERR_11007);
    }
    return this.userService.remove(+id);
  }

  /**
   * 更新用户信息
   * @param id 用户ID
   * @param user 更新用户数据传输对象
   * @returns 更新后的用户信息
   */
  @Patch(':id')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN', 'SYS_ADMIN')
  @Audit({ description: '更新用户信息', saveReqBody: true })
  @ApiOperation({ summary: '更新用户信息' })
  updateUser(@Param('id') id: number, @Body() user: UpdateUserDto) {
    return this.userService.update(id, user);
  }

  /**
   * 更新用户个人资料
   * @param profile 更新个人资料数据传输对象
   * @param id 用户ID
   * @param req 请求对象（包含当前用户信息）
   * @returns 更新后的个人资料
   * @throws CustomException 当尝试修改他人资料时抛出异常
   */
  @Patch('/profile/:id')
  @UseGuards(PreviewGuard)
  @Audit({ description: '更新用户个人资料', saveReqBody: true })
  @ApiOperation({ summary: '更新用户个人资料' })
  updateProfile(@Body() profile: UpdateProfileDto, @Param('id') id: number, @Request() req: any) {
    const currentUser = req.user;
    if (currentUser.id !== +id) {
      throw new CustomException(ErrorCode.ERR_11008);
    }
    return this.userService.updateProfile(id, profile);
  }

  /**
   * 获取当前用户详情
   * @param req 请求对象（包含当前用户信息）
   * @returns 当前用户的详细信息
   */
  @Get('detail')
  @Audit({ description: '获取当前用户详情' })
  @ApiOperation({ summary: '获取当前用户详情' })
  getUserInfo(@Request() req: any) {
    const currentUser = req.user;
    return this.userService.findUserProfile(currentUser.id);
  }

  /**
   * 重置用户密码
   * @param id 用户ID
   * @returns 重置结果
   */
  @Patch(':id/reset-password')
  @UseGuards(PreviewGuard)
  @Roles('SUPER_ADMIN')
  @Audit({ description: '重置用户密码' })
  @ApiOperation({ summary: '重置用户密码为默认密码 123456' })
  resetPassword(@Param('id') id: number) {
    return this.userService.resetPassword(+id, '123456');
  }

  /**
   * 根据用户名查询用户
   * @param username 用户名
   * @returns 用户详细信息
   */
  @Get(':username')
  @Roles('SUPER_ADMIN')
  @Audit({ description: '根据用户名查询用户' })
  @ApiOperation({ summary: '根据用户名查询用户' })
  getUser(@Param('username') username: string) {
    return this.userService.findByUsername(username);
  }
}
