import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Profile, Strategy } from 'passport-google-oauth20';
import { SocialLoginPayload } from '../interfaces/social-login.interface';
import { Provider } from '@prisma/client';
import { OAUTH_ERRORS_CODES } from '../constants/auth.constants';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_REDIRECT_URI'),
      scope: ['email', 'profile'],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { id, displayName } = profile;

    if (!id || !displayName) {
      throw new BadRequestException(OAUTH_ERRORS_CODES.INVALID_OAUTH_PROFILE);
    }

    const payload: SocialLoginPayload = {
      provider: Provider.GOOGLE,
      providerId: id.toString(),
      nickname: displayName,
    };

    return payload;
  }
}
