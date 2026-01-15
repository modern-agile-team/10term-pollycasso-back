import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Request, Response } from 'express';
import { buildErrorResponse } from '../utils/error-response.util';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw = exception instanceof HttpException ? exception.getResponse() : exception;

    const standardResponse = buildErrorResponse(raw, status);

    if (status >= 500) {
      const logMessage =
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : JSON.stringify(exception);
      this.logger.error(`[${request.method} ${request.url}] Unhandled exception`, logMessage);
    } else if (status >= 400) {
      this.logger.warn(
        `[${request.method} ${request.url}] Client error - ${standardResponse.code}`,
      );
    }

    response.status(status).json(standardResponse);
  }
}
