import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponse {
  status: number;
  code: string;
  errors: unknown[];
}

interface HttpExceptionResponse {
  code?: string;
  message?: string;
  errors?: unknown[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = 500;
    let code = 'INTERNAL_SERVER_ERROR';
    let errors: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        code = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as HttpExceptionResponse;
        code = resp.code ?? (typeof resp.message === 'string' ? resp.message : code);
        errors = Array.isArray(resp.errors) ? resp.errors : [];
      }
    }

    const body: ErrorResponse = { status, code, errors };
    response.status(status).json(body);
  }
}
