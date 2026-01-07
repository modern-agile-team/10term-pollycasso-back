import { ArgumentsHost, Catch, Inject } from '@nestjs/common';
import type { LoggerService, HttpException, HttpStatus } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { buildErrorResponse } from '../utils/error-response.util';

interface WsErrorPayload {
  status?: number;
  code?: string;
  message?: string;
}

function hasStatus(value: unknown): value is { status: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status: unknown }).status === 'number'
  );
}

@Catch()
export class SocketExceptionFilter extends BaseWsExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    super();
  }

  override catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    const raw: unknown =
      exception instanceof WsException ? (exception.getError?.() ?? exception) : exception;

    const status = hasStatus(raw) ? raw.status : 500;

    const normalized = buildErrorResponse(raw as WsErrorPayload, status);

    const namespace = client.nsp.name;
    const event = host.switchToWs().getPattern() || 'connection';

    if (normalized.status >= 500) {
      const logMessage =
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : JSON.stringify(exception);
      this.logger.error(`[WS ${namespace} ${event}] Unhandled exception`, logMessage);
    } else if (normalized.status >= 400) {
      this.logger.warn(`[WS ${namespace} ${event}] Client error - ${normalized.code}`);
    }

    client.emit('system:notification', normalized);

    if (normalized.status === 401) {
      setTimeout(() => client.disconnect(), 0);
    }
  }
}
