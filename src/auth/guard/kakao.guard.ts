import { BadGatewayException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OAUTH_ERRORS_CODES } from '../constants/auth.constants';

@Injectable()
export class KakaoGuard extends AuthGuard('kakao') {
  handleRequest(err, user, info) {
    if (err || !user) {
      if (err?.status >= 500) {
        throw new BadGatewayException(OAUTH_ERRORS_CODES.OAUTH_PROVIDER_ERROR);
      }

      throw new UnauthorizedException(OAUTH_ERRORS_CODES.INVALID_OAUTH_CODE);
    }

    return user;
  }
}
