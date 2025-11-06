import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { Response } from 'express';

interface ResponseWithCode {
  code: string;
  data?: unknown;
}

interface StandardResponse {
  status: number;
  code: string;
  data: unknown;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponse> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown): StandardResponse => {
        if (this.isResponseWithCode(data)) {
          return {
            status: response.statusCode,
            code: data.code,
            data: this.normalizeData(data.data),
          };
        }

        return {
          status: response.statusCode,
          code: 'SUCCESS',
          data: this.normalizeData(data),
        };
      }),
    );
  }

  private isResponseWithCode(value: unknown): value is ResponseWithCode {
    return (
      typeof value === 'object' &&
      value !== null &&
      'code' in value &&
      typeof (value as Record<string, unknown>).code === 'string'
    );
  }

  private normalizeData(value: unknown): unknown {
    if (value === null || value === undefined) {
      return [];
    }
    return value;
  }
}
