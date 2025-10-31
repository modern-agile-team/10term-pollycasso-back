import { Body, Controller, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/requests/signup-request.dto';
import { AccessTokenGuard } from './guard/access-token.guard';
import { RefreshTokenGuard } from './guard/refresh-token.guard';
import { ConfigService } from '@nestjs/config';
import type { RefreshAuthRequest } from './interfaces/refresh-auth-request.interface';
import { LoginRequestDto } from './dto/requests/login-request.dto';
import { LOCAL_ERROR_CODES } from './constants/auth.constants';

@Controller('auth')
export class AuthController {
  private readonly refreshName: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.refreshName = this.configService.getOrThrow<string>('REFRESH_NAME');
  }

  @Post('signup')
  async create(@Body() data: SignupRequestDto): Promise<void> {
    await this.authService.signup(data);
    return;
  }

  @Post('login')
  async login(@Body() body: LoginRequestDto, @Res({ passthrough: true }) res: ExpressResponse) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) {
      throw new UnauthorizedException(LOCAL_ERROR_CODES.INVALID_CREDENTIALS);
    }
    const { accessToken, refreshToken } = await this.authService.login(user);

    this.setRefreshToken(res, refreshToken);

    return { accessToken };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  refresh(@Req() req: RefreshAuthRequest) {
    return this.authService.refreshAccessOnly(req.user);
  }

  @UseGuards(AccessTokenGuard)
  @Post('logout')
  async logout(@Req() req: RefreshAuthRequest, @Res({ passthrough: true }) res: ExpressResponse) {
    await this.authService.logout(req.user);
    this.clearCookie(res);
  }

  private setRefreshToken(res: ExpressResponse, refreshToken: string) {
    res.cookie(this.refreshName, refreshToken, {
      ...this.commonCookieOptions(),
      maxAge: parseInt(this.configService.getOrThrow<string>('COOKIE_MAXAGE'), 10),
    });
  }

  private clearCookie(res: ExpressResponse) {
    res.clearCookie(this.refreshName, this.commonCookieOptions());
  }

  private commonCookieOptions() {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: this.configService.get<string>('COOKIE_SECURE') === 'true',
      sameSite: 'lax' as const,
      domain: isProd ? '.pollycasso.com' : undefined,
      path: '/',
    };
  }
}
