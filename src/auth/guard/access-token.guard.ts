import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ACCESS_TOKEN_ERROR_CODES } from '../constants/auth.constants';
import { TokenExpiredError } from '@nestjs/jwt';

@Injectable()
export class AccessTokenGuard extends AuthGuard('access-token') {
  handleRequest<TUser = any>(
    err: Error | null,
    user: TUser,
    info: unknown,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    if (info && typeof info === 'object') {
      const maybeInfo = info as Record<string, unknown>;
      const messageValue = maybeInfo['message'];

      if (typeof messageValue === 'string') {
        if (messageValue === 'No auth token' || messageValue === 'jwt must be provided') {
          throw new UnauthorizedException(ACCESS_TOKEN_ERROR_CODES.ACCESS_TOKEN_MISSING);
        }
        if (messageValue === 'jwt expired') {
          throw new UnauthorizedException(ACCESS_TOKEN_ERROR_CODES.EXPIRED_ACCESS_TOKEN);
        }
      }
    }

    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException(ACCESS_TOKEN_ERROR_CODES.EXPIRED_ACCESS_TOKEN);
    }
    if (err || !user) {
      throw err || new UnauthorizedException(ACCESS_TOKEN_ERROR_CODES.INVALID_ACCESS_TOKEN);
    }

    return user;
  }
}
