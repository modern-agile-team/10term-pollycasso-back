import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface WsErrorDetail {
  field?: string;
  reason: string[];
}

interface StandardWsErrorResponse {
  status: number;
  code: string;
  errors: WsErrorDetail[];
}

interface WsExceptionBody {
  status?: number;
  code?: string;
  error?: string;
  message?: string | string[];
  errors?: {
    field?: string;
    reason?: string[];
    messages?: string[];
  }[];
}

@Catch()
export class SocketExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(SocketExceptionFilter.name);

  override catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const normalized = this.normalize(exception);
    client.emit('exception', normalized);
  }

  private isWsExceptionBody(data: unknown): data is WsExceptionBody {
    return typeof data === 'object' && data !== null;
  }

  private normalize(raw: unknown): StandardWsErrorResponse {
    if (raw instanceof WsException) {
      raw = raw.getError?.() ?? raw;
    }

    if (!this.isWsExceptionBody(raw)) {
      return {
        status: 500,
        code: 'UNKNOWN_ERROR',
        errors: [],
      };
    }

    const status = raw.status ?? 400;
    const primaryMessage = Array.isArray(raw.message) ? raw.message[0] : raw.message;
    const code = raw.code ?? this.normalizeCode(raw.error ?? primaryMessage) ?? 'UNKNOWN_ERROR';
    const errors = Array.isArray(raw.errors)
      ? raw.errors.map((e) => ({
          field: e.field,
          reason: e.reason ?? e.messages ?? [],
        }))
      : primaryMessage
        ? [{ reason: [primaryMessage] }]
        : [];

    return { status, code, errors };
  }

  private normalizeCode(code?: string): string | undefined {
    if (!code) return;
    return code.trim().toUpperCase().replace(/\s+/g, '_');
  }
}
