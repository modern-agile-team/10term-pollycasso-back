import { Logger } from 'winston';

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
  logger: Logger,
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
    message,
    ...contextInfo,
    stack: isError ? exception.stack : undefined,
  };

  if (status >= 500) {
    logger.error(meta);
  } else if (status >= 400) {
    logger.warn(meta);
  }
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return 'Unknown error (circular structure)';
  }
}
