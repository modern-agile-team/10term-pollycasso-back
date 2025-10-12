import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'refresh-token') {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: (req: Request) => {
        const refreshToken = req.cookies?.['refreshToken'] as string | undefined;
        return refreshToken ?? null;
      },
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }
  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.cookies['refreshToken'] as string;

    const key: string = `refresh:${String(payload.sub)}`;

    const cachedRefreshToken: string | null = await this.redisService.get(key);
    if (!cachedRefreshToken || refreshToken !== cachedRefreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return { ...payload, refreshToken };
  }
}
