import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
