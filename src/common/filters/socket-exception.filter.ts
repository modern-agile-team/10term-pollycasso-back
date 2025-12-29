import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { buildErrorResponse } from '../utils/error-response.util';

@Catch()
export class SocketExceptionFilter extends BaseWsExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    const raw =
      exception instanceof WsException ? (exception.getError?.() ?? exception) : exception;

    const normalized = buildErrorResponse(raw, 500);

    client.emit('exception', normalized);
  }
}
