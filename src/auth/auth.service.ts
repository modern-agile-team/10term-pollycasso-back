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
import { LoginResponseDto } from './dtos/responses/login-response.dto';
import { AccessTokenDto } from './dtos/responses/access-token.dto';
import { PasswordEncoderUtil } from 'src/common/utils/password-encoder.util';
import { AUTH_DOMAIN_ERRORS } from './constants/auth.constant';
import { PresenceService } from 'src/presence/presence.service';
import { OutfitConverterService } from 'src/outfit/outfit-converter.service';
import { DEFAULT_OUTFIT_PATHS } from 'src/outfit/constants/outfit.constant';
import { UserWithProfile } from 'src/user/types/user-with-profile.type';
import { Outfit } from 'src/outfit/entities/outfit.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly presenceService: PresenceService,
    private readonly outfitConverterService: OutfitConverterService,
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

    if (!user?.hashedPassword) {
      return null;
    }

    const isMatch = await PasswordEncoderUtil.compare(password, user.hashedPassword);

    if (!isMatch) {
      return null;
    }

    const { hashedPassword: _, ...result } = user;
    return result as UserData;
  }

  async login(
    userData: UserData,
  ): Promise<{ tokens: TokenDto; profile: Partial<LoginResponseDto> }> {
    return this.issueLoginResult(userData);
  }

  async socialLogin(
    socialUser: SocialLoginPayload,
  ): Promise<{ tokens: TokenDto; profile: Partial<LoginResponseDto> }> {
    let user = await this.userService.findUserByProvider(
      socialUser.provider,
      socialUser.providerId,
    );

    if (!user) {
      user = await this.userService.createSocialUser(socialUser);
    }

    return this.issueLoginResult(user);
  }

  refreshAccessOnly(userData: JwtPayload): AccessTokenDto {
    const payload = this.createJwtPayloadFromToken(userData);
    return this.tokenService.refreshAccessOnly(payload);
  }

  async logout(userData: JwtPayload): Promise<void> {
    await Promise.all([
      this.presenceService.markOffline(userData.sub),
      this.tokenService.revokeToken(userData.sub),
    ]);
  }

  private async issueLoginResult(
    user: UserData,
  ): Promise<{ tokens: TokenDto; profile: Partial<LoginResponseDto> }> {
    await this.presenceService.markOnline(user.id);

    const payload = this.createJwtPayload(user);

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.createAccessToken(payload),
      this.tokenService.createRefreshToken(payload),
    ]);

    const userWithProfile = await this.userService.findOneWithProfile(user.id);
    const profile = await this.buildProfileData(userWithProfile);

    return {
      tokens: { accessToken, refreshToken },
      profile,
    };
  }

  private async buildProfileData(
    userWithProfile: UserWithProfile | null,
  ): Promise<Partial<LoginResponseDto>> {
    if (!userWithProfile?.profile) {
      return {
        coins: 0,
        level: 1,
        currentExp: 0,
        outfit: DEFAULT_OUTFIT_PATHS,
      };
    }

    const { profile } = userWithProfile;

    const outfitPaths = await this.outfitConverterService.convertIdsToPath(
      Outfit.fromJSON(profile.outfit).getAll(),
    );

    return {
      coins: profile.coin ?? 0,
      level: profile.level ?? 1,
      currentExp: profile.experience ?? 0,
      outfit: outfitPaths,
    };
  }

  private createJwtPayload(user: UserData): JwtPayload {
    return {
      sub: user.id,
      nickname: user.nickname,
      tag: user.tag,
    };
  }

  private createJwtPayloadFromToken(userData: JwtPayload): JwtPayload {
    return {
      sub: userData.sub,
      nickname: userData.nickname,
      tag: userData.tag,
    };
  }

  validateRedirectUrl(state: string): string {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const fallbackUrl = new URL('/auth/callback', frontendUrl).toString();

    if (!state) {
      return fallbackUrl;
    }

    const whitelist = this.buildRedirectWhitelist(frontendUrl);

    try {
      return this.validateAndBuildRedirectUrl(state, frontendUrl, whitelist, fallbackUrl);
    } catch {
      return fallbackUrl;
    }
  }

  private buildRedirectWhitelist(frontendUrl: string): Set<string> {
    const allowedOriginsRaw = this.configService.get<string>('ALLOW_REDIRECT_ORIGINS') ?? '';

    const origins = [
      new URL(frontendUrl).origin,
      ...allowedOriginsRaw.split(',').map((s) => s.trim()),
    ].filter(Boolean);

    return new Set<string>(origins);
  }

  private validateAndBuildRedirectUrl(
    state: string,
    frontendUrl: string,
    whitelist: Set<string>,
    fallbackUrl: string,
  ): string {
    if (state.startsWith('/') && !state.startsWith('//')) {
      return new URL(state, frontendUrl).toString();
    }

    const parsed = new URL(state);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return fallbackUrl;
    }

    if (!whitelist.has(parsed.origin)) {
      return fallbackUrl;
    }

    if (parsed.username || parsed.password) {
      return fallbackUrl;
    }

    return parsed.toString();
  }
}
