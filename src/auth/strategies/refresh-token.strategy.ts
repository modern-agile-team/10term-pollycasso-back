import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { RedisService } from '../redis/redis.service';
import { JwtPaylode } from '../interfaces/jwt-paylode.interface';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'refresh-token') {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: (req: Request) => {
        const refreshToken = req.cookies?.['refreshToken'];
        return refreshToken;
      },
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }
  async validate(req: Request, payload: JwtPaylode) {
    const refreshToken = req.cookies['refreshToken'];

    const key = `refresh:${String(payload.sub)}`;

    const cachedRefreshToken = await this.redisService.get(key);
    if (!cachedRefreshToken || refreshToken !== cachedRefreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return { ...payload, refreshToken };
  }
}
