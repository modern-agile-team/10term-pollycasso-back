import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { SocialLoginPayload } from '../interfaces/social-login.interface';
import { Provider } from '@prisma/client';
import { OAUTH_ERRORS_CODES } from '../constants/auth.constants';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('KAKAO_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('KAKAO_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('KAKAO_REDIRECT_URI'),
    });
  }

  validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { id, username } = profile;

    if (!id || !username) {
      throw new BadRequestException(OAUTH_ERRORS_CODES.INVALID_OAUTH_PROFILE);
    }

    const payload: SocialLoginPayload = {
      provider: Provider.KAKAO,
      providerId: id.toString(),
      nickname: username,
    };

    return payload;
  }
}
