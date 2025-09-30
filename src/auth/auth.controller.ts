import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/requests/signup-request.dto';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { CookieService } from './cookie/cookie.service';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { RefreshTokenGuard } from './guard/refresh-token.guard';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import type { RefreshAuthRequest } from './interfaces/refresh-auth-request.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  @Post('signup')
  async create(@Body() data: SignupRequestDto, @Res({ passthrough: true }) res: ExpressResponse) {
    const { accessToken, refreshToken } = await this.authService.signup(data);

    this.cookieService.setRefreshToken(res, refreshToken);

    return { access_token: accessToken };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: ExpressResponse) {
    const { accessToken, refreshToken } = await this.authService.login(req.user);

    this.cookieService.setRefreshToken(res, refreshToken);

    return { access_token: accessToken };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  refresh(@Req() req: RefreshAuthRequest) {
    return this.authService.refreshToken(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: RefreshAuthRequest, @Res({ passthrough: true }) res: ExpressResponse) {
    await this.authService.logout(req.user);
    this.cookieService.clearCookie(res);
  }
}
