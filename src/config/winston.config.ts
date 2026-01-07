import * as winston from 'winston';
import { utilities } from 'nest-winston';
import WinstonCloudwatch from 'winston-cloudwatch';
import { ConfigService } from '@nestjs/config';

export function winstonConfig(configService: ConfigService) {
  const nodeEnv = configService.get<string>('NODE_ENV');
  const awsRegion = configService.get<string>('AWS_REGION');

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: nodeEnv === 'production' ? 'error' : 'debug',
    }),
  ];

  if (nodeEnv === 'production' && awsRegion) {
    transports.push(
      new WinstonCloudwatch({
        level: 'error',
        awsRegion,
        logGroupName: `/pollycasso/${nodeEnv}`,
        logStreamName: `${nodeEnv}-${new Date().toISOString().split('T')[0]}`,
      }),
    );
  }

  return {
    format: winston.format.combine(
      winston.format.timestamp(),
      utilities.format.nestLike('Pollycasso'),
    ),
    transports,
  };
}
