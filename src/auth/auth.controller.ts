import { Body, Controller, Post, Req, Request, Res, UseGuards } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/requests/signup-request.dto';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { CookieService } from './cookie/cookie.service';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { RefreshTokenGuard } from './guard/refresh-token.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  @Post('signup')
  async create(@Body() data: SignupRequestDto) {
    await this.authService.signup(data);
    return {
      message: '회원가입성공',
      statusCode: 201,
    };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req, @Res({ passthrough: true }) res: ExpressResponse) {
    const { accessToken, refreshToken } = await this.authService.login(req.user);

    await this.cookieService.setRefreshToken(res, refreshToken);

    return { access_token: accessToken };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  async refresh(@Req() req, @Res({ passthrough: true }) res: ExpressResponse) {
    const accessToken = await this.authService.refreshToken(req.user);
    return { access_token: accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req, @Res({ passthrough: true }) res: ExpressResponse) {
    await this.authService.logout(req.user);
    await this.cookieService.clearCookie(res);
  }
}
