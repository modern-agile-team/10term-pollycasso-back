import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponseBuilder } from '../builders/error-response.builder';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw = exception instanceof HttpException ? exception.getResponse() : exception;

    const standardResponse = ErrorResponseBuilder.build(raw, status);

    if (status >= 500) {
      const logMessage =
        exception instanceof Error ? exception.stack : JSON.stringify(exception, null, 2);
      this.logger.error('Unhandled exception', logMessage);
    }

    response.status(status).json(standardResponse);
  }
}
