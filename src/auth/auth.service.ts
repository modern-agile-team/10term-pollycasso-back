import { ConflictException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { SignupRequestDto } from './dto/requests/signup-request.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TokenService } from './token/token.service';
import { UserData } from './interfaces/user-data.interface';
import { TokenDto } from './dto/responses/token.dto';
import { AccessTokenDto } from './dto/responses/access-token.dto';
import { PasswordEncoderUtil } from 'src/common/hashing/password-encoder.util';
import { AUTH_DOMAIN_ERRORS, USER_ERROR_CODES } from './constants/auth.constants';
import { SocialLoginPayload } from './interfaces/social-login.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  // 회원가입
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

    return;
  }

  // 유저 검증
  async validateUser(username: string, password: string): Promise<UserData | null> {
    const user = await this.userService.findUserByUsername(username);
    if (!user || !user.hashedPassword) return null;

    const isMatch = await PasswordEncoderUtil.compare(password, user.hashedPassword);
    if (!isMatch) return null;

    const { hashedPassword: _, ...result } = user;
    return result;
  }

  // 로그인
  async login(userData: UserData): Promise<TokenDto> {
    const payload: JwtPayload = {
      sub: userData.id,
      nickname: userData.nickname,
    };
    const accessToken = this.tokenService.createAccessToken(payload);
    const refreshToken = await this.tokenService.createRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
    };
  }

  // accessToken 재발급
  refreshAccessOnly(userData: JwtPayload): AccessTokenDto {
    const payload: JwtPayload = {
      sub: userData.sub,
      nickname: userData.nickname,
    };
    return this.tokenService.refreshAccessOnly(payload);
  }

  // 로그아웃
  async logout(userData: JwtPayload): Promise<void> {
    await this.tokenService.revokeToken(userData.sub);
    return;
  }

  // 소셜 로그인
  async socialLogin(socialUser: SocialLoginPayload): Promise<TokenDto> {
    let user = await this.userService.findUserByProvider(
      socialUser.provider,
      socialUser.providerId,
    );

    if (!user) {
      user = await this.userService.createSocialUser(socialUser);
    }

    const payload: JwtPayload = {
      sub: user.id,
      nickname: user.nickname,
    };

    const accessToken = this.tokenService.createAccessToken(payload);
    const refreshToken = await this.tokenService.createRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
    };
  }

  // redirect URL 검증
  validateRedirectUrl(state: string) {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const fallbackUrl = new URL('/auth/callback', frontendUrl).toString();

    if (!state) return fallbackUrl;

    const allowedOriginsRaw = this.configService.get<string>('ALLOW_REDIRECT_ORIGINS') ?? '';

    const whitelist = new Set(
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
}
