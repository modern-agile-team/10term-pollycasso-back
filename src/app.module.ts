import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomsModule } from './room/room.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { utilities } from 'nest-winston';
import WinstonCloudwatch from 'winston-cloudwatch';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRoot({
      format: winston.format.combine(
        winston.format.timestamp(),
        utilities.format.nestLike('Pollycasso'),
      ),
      transports: [
        new winston.transports.Console({
          level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
        }),
        ...(process.env.NODE_ENV === 'production' && process.env.AWS_REGION
          ? [
              new WinstonCloudwatch({
                level: 'error',
                awsRegion: process.env.AWS_REGION,
                logGroupName: `/pollycasso/${process.env.NODE_ENV}`,
                logStreamName: `${process.env.NODE_ENV}-${new Date().toISOString().split('T')[0]}`,
              }),
            ]
          : []),
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    WaitingModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
