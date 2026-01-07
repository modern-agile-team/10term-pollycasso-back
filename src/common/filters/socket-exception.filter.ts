import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { buildErrorResponse } from '../utils/error-response.util';

interface WsError {
  status?: number;
  message?: string;
}

@Catch()
export class SocketExceptionFilter extends BaseWsExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let raw: unknown = exception;

    if (exception instanceof WsException) {
      raw = exception.getError?.() ?? exception;
      const wsError = raw as WsError;
      status = wsError.status ?? 500;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      raw = exception.getResponse();
    }

    const normalized = buildErrorResponse(raw, status);

    client.emit('system:notification', normalized);
  }
}
