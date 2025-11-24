import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { kakaoPayload } from '../interfaces/kakao.interface';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('KAKAO_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('KAKAO_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('KAKAO_REDIRECT_URI'),
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile): Promise<any> {
    const { id, username } = profile;

    const payload: kakaoPayload = {
      kakaoId: id.toString(),
      nickname: username!,
    };

    return payload;
  }
}
