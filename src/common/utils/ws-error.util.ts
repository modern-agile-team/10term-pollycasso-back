import { WsException } from '@nestjs/websockets';
import { ErrorDetail } from './error-response.util';

export function wsError(status: number, code: string, errors: ErrorDetail[] = []): WsException {
  return new WsException({ status, code, errors });
}
