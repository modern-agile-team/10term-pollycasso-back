import { Injectable } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CookieService {
  constructor(private readonly configService: ConfigService) {}
  private readonly refreshName = 'refreshToken';

  setRefreshToken(res: ExpressResponse, refreshToken: string) {
    res.cookie(this.refreshName, refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('COOKIE_SECURE') === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: parseInt(this.configService.getOrThrow<string>('COOKIE_MAXAGE'), 10),
    });
  }

  clearCookie(res: ExpressResponse) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: this.configService.get<string>('COOKIE_SECURE') === 'true',
      sameSite: 'lax',
      path: '/',
    });
  }
}
