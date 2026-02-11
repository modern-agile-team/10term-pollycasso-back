import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import type { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    return request.user;
  },
);
