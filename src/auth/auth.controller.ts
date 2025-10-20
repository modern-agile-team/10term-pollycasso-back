import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/requests/signup-request.dto';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { RefreshTokenGuard } from './guard/refresh-token.guard';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import type { RefreshAuthRequest } from './interfaces/refresh-auth-request.interface';

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

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: ExpressResponse) {
    const { accessToken, refreshToken } = await this.authService.login(req.user);

    this.setRefreshToken(res, refreshToken);

    return { accessToken };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  refresh(@Req() req: RefreshAuthRequest) {
    return this.authService.refreshAccessOnly(req.user);
  }

  @UseGuards(JwtAuthGuard)
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
