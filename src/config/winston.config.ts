import * as winston from 'winston';
import WinstonCloudwatch from 'winston-cloudwatch';
import { ConfigService } from '@nestjs/config';
import type { TransformableInfo } from 'logform';

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function winstonConfig(configService: ConfigService) {
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const awsRegion = configService.get<string>('AWS_REGION');

  const timestampKST = winston.format.timestamp({
    format: () =>
      new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
      }),
  });

  const removeStack = winston.format((info: TransformableInfo) => {
    if (info.level !== 'error') {
      delete info.stack;
    }
    return info;
  });

  const devConsoleFormat = winston.format.printf((info: TransformableInfo) => {
    const level = getString(info.level);
    const message = getString(info.message);
    const ctx = getString(info.context, 'APP');
    const timestamp = getString(info.timestamp);
    const stack = typeof info.stack === 'string' ? info.stack : undefined;

    const base = `[PollyCasso] [${ctx}] ${level.toUpperCase()} ${message}`;

    return stack ? `${timestamp} ${base}\n${stack}` : `${timestamp} ${base}`;
  });

  const prodConsoleFormat = winston.format.printf((info: TransformableInfo) => {
    const level = getString(info.level);
    const message = getString(info.message);
    const ctx = getString(info.context, 'APP');
    const timestamp = getString(info.timestamp);

    return `${timestamp} [PollyCasso] [${ctx}] ${level.toUpperCase()} ${message}`;
  });

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: nodeEnv === 'production' ? 'warn' : 'debug',
      format:
        nodeEnv === 'production'
          ? winston.format.combine(timestampKST, removeStack(), prodConsoleFormat)
          : winston.format.combine(timestampKST, devConsoleFormat),
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
            stack: info.stack ?? null,
            userId: info.userId ?? null,
            socketId: info.socketId ?? null,
            method: info.method ?? null,
            url: info.url ?? null,
            namespace: info.namespace ?? null,
            event: info.event ?? null,
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
