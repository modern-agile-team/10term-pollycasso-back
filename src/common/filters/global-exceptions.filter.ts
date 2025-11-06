import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponse {
  field: string;
  reason: string | string[];
}

interface StandardResponse {
  status: number;
  code: string;
  errors: ErrorResponse[];
}

interface HttpExceptionBody {
  code?: string;
  error?: string;
  message?: string | string[];
  errors?: ErrorResponse[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const standardResponse = this.buildResponse(exception, status);

    if (status >= 500) {
      const logMessage =
        exception instanceof Error ? exception.stack : JSON.stringify(exception, null, 2);
      this.logger.error('Unhandled exception', logMessage);
    }

    response.status(status).json(standardResponse);
  }

  private buildResponse(exception: unknown, status: number): StandardResponse {
    if (!(exception instanceof HttpException)) {
      return {
        status,
        code: 'INTERNAL_SERVER_ERROR',
        errors: [],
      };
    }

    const responseBody = exception.getResponse();

    if (typeof responseBody === 'string') {
      return {
        status,
        code: this.normalizeCode(responseBody) ?? 'UNKNOWN_ERROR',
        errors: [],
      };
    }

    const body = responseBody as HttpExceptionBody;

    const messageForCode = Array.isArray(body.message) ? body.message[0] : body.message;
    const code = body.code ?? this.normalizeCode(body.error ?? messageForCode) ?? 'UNKNOWN_ERROR';

    const errors: ErrorResponse[] = Array.isArray(body.errors) ? body.errors : [];

    return { status, code, errors };
  }

  private normalizeCode(code?: string): string | undefined {
    if (!code) return undefined;
    return code.trim().toUpperCase().replace(/\s+/g, '_');
  }
}
