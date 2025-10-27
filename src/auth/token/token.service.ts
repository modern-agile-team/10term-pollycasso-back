import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { AccessTokenDto } from '../dto/responses/access-token.dto';
import { ACCESS_TOKEN_ERROR_CODES } from '../constants/auth.constants';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  // accessToken 생성
  createAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRATION'),
    });
  }

  // refreshToken 생성 및 Redis 저장
  async createRefreshToken(payload: JwtPayload): Promise<string> {
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRATION'),
    });

    const key = `refresh:${payload.sub}`;
    const ttl = parseInt(this.configService.getOrThrow<string>('REDIS_TTL'));

    await this.redisService.set(key, refreshToken, ttl);

    return refreshToken;
  }

  // accessToken 재발급
  refreshAccessOnly(payload: JwtPayload): AccessTokenDto {
    const accessToken = this.createAccessToken(payload);
    return { accessToken };
  }

  // refreshToken 제거
  async revokeToken(userId: number) {
    const key = `refresh:${userId}`;
    await this.redisService.del(key);
  }

  // 토큰 검증
  async validateToken(token: string, type: 'access' | 'refresh'): Promise<JwtPayload> {
    const secret =
      type === 'access'
        ? this.configService.getOrThrow<string>('JWT_ACCESS_SECRET')
        : this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
      return payload;
    } catch {
      throw new UnauthorizedException(ACCESS_TOKEN_ERROR_CODES.INVALID_ACCESS_TOKEN);
    }
  }
}
