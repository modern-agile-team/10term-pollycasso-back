import { Module } from '@nestjs/common';
import { TopicGateway } from './topic/topic.gateway';
import { TopicService } from './topic/topic.service';
import { GAME_STATE_STORE } from './interfaces/game-state-store.interfaces';
import { InMemoryGameStateStore } from './infra/game-state.store.inmemory';
import { GameGateway } from './game.gateway';
import { ChatModule } from 'src/chat/chat.module';
import { JwtModule } from '@nestjs/jwt';
import { GAME_EVENT_PUBLISHER } from './interfaces/game-event-publisher.interfaces';
import { GameSessionService } from './session/game-session.service';
import { WaitingModule } from 'src/waiting/waiting.module';
import { DrawingGateway } from './drawing/drawing.gateway';

@Module({
  imports: [
    WaitingModule,
    ChatModule,
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
    { provide: GAME_STATE_STORE, useClass: InMemoryGameStateStore },
    { provide: GAME_EVENT_PUBLISHER, useExisting: GameGateway },
    DrawingGateway,
  ],
  exports: [],
})
export class GameModule {}
