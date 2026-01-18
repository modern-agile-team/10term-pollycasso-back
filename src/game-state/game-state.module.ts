import { Module } from '@nestjs/common';
import { GameStateStore } from './game-state.store';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [GameStateStore],
  exports: [GameStateStore],
})
export class GameStateModule {}
