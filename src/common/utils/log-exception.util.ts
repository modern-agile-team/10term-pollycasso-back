import { ILogger } from 'src/config/winston.config';

interface LogContext {
  context: string;
  userId?: number;
  socketId?: string;
  method?: string;
  url?: string;
  namespace?: string;
  event?: string;
  code?: string;
}

export function logException(
  logger: ILogger,
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

  if (status >= 500) {
    logger.error({
      message,
      ...contextInfo,
      status,
      stack: isError ? exception.stack : undefined,
    });
  } else if (status >= 400) {
    logger.warn({
      message,
      ...contextInfo,
      status,
    });
  }
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return 'Unknown error (circular structure)';
  }
}
