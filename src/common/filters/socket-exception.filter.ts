import { ArgumentsHost, Catch, Inject, HttpException } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
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
