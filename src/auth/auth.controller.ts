import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/requests/signup-request.dto';
import { AccessTokenGuard } from './guard/access-token.guard';
import { RefreshTokenGuard } from './guard/refresh-token.guard';
import { ConfigService } from '@nestjs/config';
import type { RefreshAuthRequest } from './interfaces/refresh-auth-request.interface';
import { LoginRequestDto } from './dto/requests/login-request.dto';
import { AUTH_ERROR_CODES } from './constants/auth.constants';
import { ApiAuth } from 'src/auth/auth.swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { KakaoGuard } from './guard/kakao.guard';
import { GoogleGuard } from './guard/google.guard';
import type { SocialLoginRequest } from './interfaces/social-login-request.interface';

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
  @ApiAuth.signup()
  async create(@Body() data: SignupRequestDto): Promise<void> {
    await this.authService.signup(data);
    return;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiAuth.login()
  async login(@Body() body: LoginRequestDto, @Res({ passthrough: true }) res: ExpressResponse) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) {
      throw new UnauthorizedException({ code: AUTH_ERROR_CODES.INVALID_CREDENTIALS });
    }
    const { accessToken, refreshToken } = await this.authService.login(user);

    this.setRefreshToken(res, refreshToken);

    return { accessToken };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiAuth.refresh()
  refresh(@Req() req: RefreshAuthRequest) {
    return this.authService.refreshAccessOnly(req.user);
  }

  @UseGuards(AccessTokenGuard)
  @Post('logout')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiAuth.logout()
  async logout(@Req() req: RefreshAuthRequest, @Res({ passthrough: true }) res: ExpressResponse) {
    await this.authService.logout(req.user);
    this.clearCookie(res);
  }

  @Get('kakao')
  @UseGuards(KakaoGuard)
  @ApiAuth.kakao()
  kakaoLogin() {
    return;
  }

  @Get('kakao/callback')
  @UseGuards(KakaoGuard)
  @HttpCode(HttpStatus.OK)
  @ApiAuth.kakaocallback()
  async kakaoLoginCallback(
    @Req() req: SocialLoginRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const { accessToken, refreshToken } = await this.authService.socialLogin(req.user);

    this.setRefreshToken(res, refreshToken);

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    return res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}`);
  }

  @Get('google')
  @UseGuards(GoogleGuard)
  @ApiAuth.google()
  googleLogin() {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiAuth.googlecallback()
  async googleLoginCallback(
    @Req() req: SocialLoginRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const { accessToken, refreshToken } = await this.authService.socialLogin(req.user);

    this.setRefreshToken(res, refreshToken);

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    return res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}`);
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
