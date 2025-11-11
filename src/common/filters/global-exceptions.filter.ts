import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  StandardErrorResponseDto,
  ErrorDetailDto,
} from '../dtos/responses/standard-error-response.dto';
import { ERROR_CODES } from '../constants/common.constant';

interface HttpExceptionBody {
  code?: string;
  error?: string;
  message?: string[];
  errors?: ErrorDetailDto[];
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

  private buildResponse(exception: unknown, status: number): StandardErrorResponseDto {
    if (!(exception instanceof HttpException)) {
      return {
        status,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        errors: [],
      };
    }

    const responseBody = exception.getResponse();
    const body = responseBody as HttpExceptionBody;
    const primaryMessage = Array.isArray(body.message) ? body.message[0] : body.message;
    const code =
      body.code ?? this.normalizeCode(body.error ?? primaryMessage) ?? ERROR_CODES.UNKNOWN_ERROR;
    const errors: ErrorDetailDto[] = Array.isArray(body.errors) ? body.errors : [];

    return { status, code, errors };
  }

  private normalizeCode(code?: string): string | undefined {
    if (!code) return undefined;
    return code.trim().toUpperCase().replace(/\s+/g, '_');
  }
}
