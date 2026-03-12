import { CustomException, ErrorCode } from '@/common/exceptions/custom.exception';
import { ACCESS_TOKEN_EXPIRATION_TIME } from '@/constants/redis.contant';
import { RedisService } from '@/shared/redis.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '@/modules/user/user.service';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    protected configService: ConfigService,
    private redisService: RedisService,
    private userService: UserService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || configService.get('JWT_SECRET'),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const user = await this.userService.findByUsername(payload.username);
    if (!user) {
      throw new CustomException(ErrorCode.ERR_10002, '用户不存在');
    }
    if (!user.enable) {
      throw new CustomException(ErrorCode.ERR_11007);
    }
    const currentRole = user.roles.find((item: any) => item.code === payload.currentRoleCode);
    if (!currentRole || !currentRole.enable) {
      throw new CustomException(ErrorCode.ERR_11008);
    }

    const reqToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    const accessToken = await this.redisService.get(this.authService.getAccessTokenKey(payload));

    if (reqToken !== accessToken) {
      this.redisService.del(this.authService.getAccessTokenKey(payload));
      throw new HttpException(ErrorCode.ERR_11002, HttpStatus.UNAUTHORIZED);
    }

    if (accessToken) {
      this.redisService.set(
        this.authService.getAccessTokenKey(payload),
        accessToken,
        ACCESS_TOKEN_EXPIRATION_TIME,
      );
    }

    return {
      userId: payload.userId,
      username: payload.username,
      roleCodes: payload.roleCodes || [],
      currentRoleCode: payload.currentRoleCode,
    };
  }
}
