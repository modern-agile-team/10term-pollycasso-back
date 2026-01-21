import { Module } from '@nestjs/common';
import { TopicGateway } from './topic/topic.gateway';
import { TopicService } from './topic/topic.service';
import { GameGateway } from './game.gateway';
import { ChatModule } from 'src/chat/chat.module';
import { JwtModule } from '@nestjs/jwt';
import { GAME_EVENT_PUBLISHER } from './interfaces/game-event-publisher.interfaces';
import { GameSessionService } from './session/game-session.service';
import { WaitingModule } from 'src/waiting/waiting.module';
import { GameStateStore } from 'src/game-state/game-state.store';
import { RedisModule } from 'src/redis/redis.module';
import { GAME_STATE_STORE } from 'src/game-state/interfaces/game-state.interface';

@Module({
  imports: [
    WaitingModule,
    ChatModule,
    RedisModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRATION },
    }),
  ],
  controllers: [],
  providers: [
    GameGateway,
    TopicGateway,
    TopicService,
    GameSessionService,
    { provide: GAME_STATE_STORE, useClass: GameStateStore },
    { provide: GAME_EVENT_PUBLISHER, useExisting: GameGateway },
  ],
  exports: [],
})
export class GameModule {}
