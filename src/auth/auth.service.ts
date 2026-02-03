import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/user/user.service';
import { SignupRequestDto } from './dtos/requests/signup-request.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TokenService } from './tokens/token.service';
import { UserData } from './interfaces/user-data.interface';
import { SocialLoginPayload } from './interfaces/social-login.interface';
import { USER_ERROR_CODES } from 'src/user/constants/user.constant';
import { TokenDto } from './dtos/responses/token.dto';
import { AccessTokenDto } from './dtos/responses/access-token.dto';
import { PasswordEncoderUtil } from 'src/common/utils/password-encoder.util';
import { AUTH_DOMAIN_ERRORS } from './constants/auth.constant';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AuthService {
  private readonly ONLINE_STATUS_TTL = 86400;

  constructor(
    private readonly userService: UsersService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async signup(signupRequestDto: SignupRequestDto): Promise<void> {
    const existingUser = await this.userService.findUserByUsername(signupRequestDto.username);

    if (existingUser) {
      throw new ConflictException({
        code: USER_ERROR_CODES.USERNAME_ALREADY_EXISTS,
        errors: [AUTH_DOMAIN_ERRORS.USERNAME_ALREADY_EXISTS],
      });
    }

    const hashedPassword = await PasswordEncoderUtil.hash(signupRequestDto.password);

    await this.userService.createUser({
      username: signupRequestDto.username,
      nickname: signupRequestDto.nickname,
      hashedPassword,
    });
  }

  async validateUser(username: string, password: string): Promise<UserData | null> {
    const user = await this.userService.findUserByUsername(username);
    if (!user || !user.hashedPassword) return null;

    const isMatch = await PasswordEncoderUtil.compare(password, user.hashedPassword);
    if (!isMatch) return null;

    const { hashedPassword: _, ...result } = user;
    return result as UserData;
  }

  async login(userData: UserData): Promise<TokenDto> {
    await this.setUserOnline(userData.id);

    const payload: JwtPayload = {
      sub: userData.id,
      nickname: userData.nickname,
      tag: userData.tag,
    };

    const accessToken = this.tokenService.createAccessToken(payload);
    const refreshToken = await this.tokenService.createRefreshToken(payload);

    return { accessToken, refreshToken };
  }

  refreshAccessOnly(userData: JwtPayload): AccessTokenDto {
    const payload: JwtPayload = {
      sub: userData.sub,
      nickname: userData.nickname,
      tag: userData.tag,
    };

    return this.tokenService.refreshAccessOnly(payload);
  }

  async logout(userData: JwtPayload): Promise<void> {
    await this.setUserOffline(userData.sub);
    await this.tokenService.revokeToken(userData.sub);
  }

  async socialLogin(socialUser: SocialLoginPayload): Promise<TokenDto> {
    let user = await this.userService.findUserByProvider(
      socialUser.provider,
      socialUser.providerId,
    );

    if (!user) {
      user = await this.userService.createSocialUser(socialUser);
    }

    await this.setUserOnline(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      nickname: user.nickname,
      tag: user.tag,
    };

    const accessToken = this.tokenService.createAccessToken(payload);
    const refreshToken = await this.tokenService.createRefreshToken(payload);

    return { accessToken, refreshToken };
  }

  validateRedirectUrl(state: string): string {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const fallbackUrl = new URL('/auth/callback', frontendUrl).toString();

    if (!state) return fallbackUrl;

    const allowedOriginsRaw = this.configService.get<string>('ALLOW_REDIRECT_ORIGINS') ?? '';

    const whitelist = new Set<string>(
      [new URL(frontendUrl).origin, ...allowedOriginsRaw.split(',').map((s) => s.trim())].filter(
        Boolean,
      ),
    );

    try {
      if (state.startsWith('/') && !state.startsWith('//')) {
        return new URL(state, frontendUrl).toString();
      }

      const parsed = new URL(state);

      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallbackUrl;
      if (!whitelist.has(parsed.origin)) return fallbackUrl;
      if (parsed.username || parsed.password) return fallbackUrl;

      return parsed.toString();
    } catch {
      return fallbackUrl;
    }
  }

  private async setUserOnline(userId: number): Promise<void> {
    await this.redisService.set(`user:${userId}:isOnline`, '1', this.ONLINE_STATUS_TTL);
  }

  private async setUserOffline(userId: number): Promise<void> {
    await this.redisService.del(`user:${userId}:isOnline`);
  }
}
