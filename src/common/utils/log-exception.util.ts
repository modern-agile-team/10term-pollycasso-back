import type { LoggerService } from '@nestjs/common';

interface LogContext {
  context: string;
  userId?: number;
  socketId?: string;
  method?: string;
  url?: string;
  namespace?: string;
  event?: string;
}

export function logException(
  logger: LoggerService,
  exception: unknown,
  status: number,
  contextInfo: LogContext,
) {
  const isError = exception instanceof Error;

  const message = isError
    ? exception.message
    : typeof exception === 'string'
      ? exception
      : safeStringify(exception);

  const meta = {
    ...contextInfo,
    stack: isError ? exception.stack : undefined,
  };

  if (status >= 500) {
    logger.error(message, meta);
  } else if (status >= 400) {
    logger.warn(message, meta);
  }
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return 'Unknown error (circular structure)';
  }
}
