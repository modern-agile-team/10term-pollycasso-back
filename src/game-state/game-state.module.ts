import { Module } from '@nestjs/common';
import { GameStateStore } from './game-state.store';

@Module({
  providers: [GameStateStore],
  exports: [GameStateStore],
})
export class GameStateModule {}
