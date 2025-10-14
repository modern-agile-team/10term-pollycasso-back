import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

interface HttpExceptionResponse {
  message: string | string[];
  errors?: unknown[];
  statusCode?: number;
  error?: string;
}

interface ErrorResponse {
  code: number;
  message: string | string[];
  errors: unknown[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = 500;
    const body: ErrorResponse = {
      code: 500,
      message: '서버 오류가 발생했습니다.',
      errors: [],
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        body.code = status;
        body.message = exceptionResponse;
        body.errors = [];
      } else {
        const responseObj = exceptionResponse as HttpExceptionResponse;
        body.code = status;
        body.message = responseObj.message;
        body.errors = responseObj.errors || [];
      }
    }

    response.status(status).json(body);
  }
}
