import { ArgumentsHost, Catch, Inject, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { buildErrorResponse } from '../utils/error-response.util';
import { logException } from '../utils/log-exception.util';
import { LOGGER_TOKEN, type ILogger } from 'src/config/winston.config';

interface WsErrorPayload {
  status?: number;
  code?: string;
  message?: string;
}

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: number;
    [key: string]: unknown;
  };
}

function hasStatus(value: unknown): value is { status: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as Record<string, unknown>).status === 'number'
  );
}

@Catch()
export class SocketExceptionFilter extends BaseWsExceptionFilter {
  constructor(
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {
    super();
  }

  override catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<AuthenticatedSocket>();

    let raw: unknown = exception;
    let status = 500;

    if (exception instanceof WsException) {
      raw = exception.getError?.() ?? exception;
      status = hasStatus(raw) ? raw.status : 500;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      raw = exception.getResponse();
    }

    const normalized = buildErrorResponse(raw as WsErrorPayload, status);
    const event = host.switchToWs().getPattern() || 'connection';

    logException(this.logger, exception, status, {
      context: 'WS',
      namespace: client.nsp.name,
      event,
      socketId: client.id,
      userId: client.data?.userId,
    });

    client.emit('system:notification', normalized);

    if (status === 401) {
      setTimeout(() => client.disconnect(), 0);
    }
  }
}
