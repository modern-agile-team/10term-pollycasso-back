import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = 500;
    let body = {
      code: 500,
      message: '서버 오류가 발생했습니다.',
      errors: [],
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      body = {
        code: status,
        message: res?.message,
        errors: res?.errors || [],
      };
    }

    response.status(status).json(body);
  }
}
