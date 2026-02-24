import * as winston from 'winston';
import WinstonCloudwatch from 'winston-cloudwatch';
import { ConfigService } from '@nestjs/config';
import type { TransformableInfo } from 'logform';

const DEFAULT_CONTEXT = 'SYSTEM';
const DEFAULT_SERVICE_NAME = 'PollyCasso';

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getStringOrNumber(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return undefined;
}

export function winstonConfig(configService: ConfigService) {
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const awsRegion = configService.get<string>('AWS_REGION');
  const serviceName = configService.get<string>('SERVICE_NAME') ?? DEFAULT_SERVICE_NAME;

  const timestampKST = winston.format.timestamp({
    format: () =>
      new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
      }),
  });

  const removeStack = winston.format((info: TransformableInfo) => {
    if (info.level !== 'error') delete info.stack;
    return info;
  });

  const buildContext = (info: TransformableInfo): string => {
    const parts: string[] = [];

    const status = getStringOrNumber(info.status);
    const method = getString(info.method);
    const url = getString(info.url);
    const namespace = getString(info.namespace);
    const event = getString(info.event);
    const code = getString(info.code);

    if (status) parts.push(status);
    if (method && url) parts.push(`${method} ${url}`);
    if (namespace) parts.push(namespace);
    if (event) parts.push(event);
    if (code) parts.push(code);

    return parts.length ? ` | ${parts.join(' | ')}` : '';
  };

  const formatLog = (info: TransformableInfo): string => {
    const ctx = getString(info.context) ?? DEFAULT_CONTEXT;
    const level = info.level;
    const message = String(info.message);
    const timestamp = String(info.timestamp);

    return `${timestamp} [${serviceName}] [${ctx}] ${level} ${message}${buildContext(info)}`;
  };

  const devFormat = winston.format.printf((info) => {
    const base = formatLog(info);

    if (info.stack) {
      const stack = typeof info.stack === 'string' ? info.stack : JSON.stringify(info.stack);
      return `${base}\n${stack}`;
    }

    return base;
  });

  const prodFormat = winston.format.printf((info) => formatLog(info));

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: nodeEnv === 'production' ? 'warn' : 'debug',
      format:
        nodeEnv === 'production'
          ? winston.format.combine(timestampKST, removeStack(), prodFormat)
          : winston.format.combine(
              timestampKST,
              removeStack(),
              winston.format.colorize(),
              devFormat,
            ),
    }),
  ];

  if (nodeEnv === 'production' && awsRegion) {
    transports.push(
      new WinstonCloudwatch({
        level: 'error',
        awsRegion,
        logGroupName: `/pollycasso/${nodeEnv}`,
        logStreamName: () => `${nodeEnv}-${new Date().toISOString().split('T')[0]}`,
        jsonMessage: true,
        messageFormatter: (info: Record<string, unknown>) =>
          JSON.stringify({
            level: info.level ?? null,
            message: info.message ?? null,
            context: info.context ?? null,
            status: info.status ?? null,
            stack: info.stack ?? null,
            userId: info.userId ?? null,
            socketId: info.socketId ?? null,
            method: info.method ?? null,
            url: info.url ?? null,
            namespace: info.namespace ?? null,
            event: info.event ?? null,
            code: info.code ?? null,
            timestamp: info.timestamp ?? new Date().toISOString(),
          }),
      }),
    );
  }

  return {
    level: nodeEnv === 'production' ? 'info' : 'debug',
    transports,
  };
}
