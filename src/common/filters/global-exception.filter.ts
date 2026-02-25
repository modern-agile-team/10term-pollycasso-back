import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { buildErrorResponse } from '../utils/error-response.util';
import { logException } from '../utils/log-exception.util';
import { LOGGER_TOKEN, type ILogger } from 'src/config/winston.config';

interface AuthenticatedRequest extends Request {
  user?: { id: number };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<AuthenticatedRequest>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw = exception instanceof HttpException ? exception.getResponse() : exception;

    const normalized = buildErrorResponse(raw, status);

    logException(this.logger, exception, status, {
      context: 'HTTP',
      method: req.method,
      url: req.url,
      userId: req.user?.id,
    });

    res.status(status).json(normalized);
  }
}
