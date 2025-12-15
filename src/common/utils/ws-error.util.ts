import { ErrorDetail, StandardErrorResponse } from '../builders/error-response.builder';
import { WsException } from '@nestjs/websockets';

export class WsError {
  static of(status: number, code: string, errors: ErrorDetail[] = []) {
    return new WsException({
      status,
      code,
      errors,
    } satisfies StandardErrorResponse);
  }

  static unauthorized(code: string) {
    return this.of(401, code);
  }

  static badRequest(code: string, errors: ErrorDetail[] = []) {
    return this.of(400, code, errors);
  }

  static internalServerError(code: string) {
    return this.of(500, code);
  }
}
