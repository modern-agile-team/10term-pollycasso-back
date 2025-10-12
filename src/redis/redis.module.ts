import { Module } from '@nestjs/common';
import { RedisModule as IoredisModule } from '@nestjs-modules/ioredis';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    IoredisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}/${configService.get('REDIS_DB')}`,
      }),
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
