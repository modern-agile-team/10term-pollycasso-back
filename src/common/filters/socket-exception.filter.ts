import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ErrorResponseBuilder } from '../builders/error-response.builder';

@Catch()
export class SocketExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(SocketExceptionFilter.name);

  override catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    const raw =
      exception instanceof WsException ? (exception.getError?.() ?? exception) : exception;

    const normalized = ErrorResponseBuilder.build(raw, 400);

    client.emit('exception', normalized);
  }
}
