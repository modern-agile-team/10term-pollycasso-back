import {
  BadGatewayException,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OAUTH_ERRORS_CODES } from '../constants/auth.constant';
import { Request } from 'express';

@Injectable()
export class GoogleGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const returnUrl = request.query.returnUrl;

    return {
      state: returnUrl,
    };
  }

  handleRequest<TUser = any>(err: (Error & { status?: number }) | null, user: TUser, _info): TUser {
    if (err || !user) {
      if (err?.status && err.status >= 500) {
        throw new BadGatewayException(OAUTH_ERRORS_CODES.OAUTH_PROVIDER_ERROR);
      }

      throw new UnauthorizedException(OAUTH_ERRORS_CODES.INVALID_OAUTH_CODE);
    }

    return user;
  }
}
