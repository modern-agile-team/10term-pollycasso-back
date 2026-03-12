import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RANKING_ERRORS } from '../constants/ranking.constant';

@Injectable()
export class NonProductionGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (nodeEnv === 'production') {
      throw new ForbiddenException(RANKING_ERRORS.NON_PRODUCTION_ENDPOINT_BLOCKED);
    }

    return true;
  }
}
