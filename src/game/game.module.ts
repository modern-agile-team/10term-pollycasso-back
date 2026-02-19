import { Module } from '@nestjs/common';
import { TopicGateway } from './topic/topic.gateway';
import { TopicService } from './topic/topic.service';
import { GameGateway } from './game.gateway';
import { ChatModule } from 'src/chat/chat.module';
import { JwtModule } from '@nestjs/jwt';
import { GAME_EVENT_PUBLISHER } from './interfaces/game-event-publisher.interfaces';
import { GameSessionService } from './session/game-session.service';
import { WaitingModule } from 'src/waiting/waiting.module';
import { DrawingGateway } from './drawing/drawing.gateway';
import { GameStateStore } from 'src/game-state/game-state.store';
import { RedisModule } from 'src/redis/redis.module';
import { GAME_STATE_STORE } from 'src/game-state/interfaces/game-state.interface';
import { DrawingService } from './drawing/drawing.service';
import { DrawingRepository } from './drawing/drawing.repository';
import { DrawingStore } from './drawing/drawing.store';
import { GameInventoryStore } from './item/stores/game-inventory.store';
import { CooldownStore } from './item/stores/cooldown.store';
import { GameItemService } from './item/game-item.service';
import { GameItemGateway } from './item/game-item.gateway';
import { ItemModule } from 'src/item/item.module';
import { EvaluationGateway } from './evaluation/evaluation.gateway';
import { DRAWING_REPO } from './drawing/interface/drawing.interface';
import { EvaluationService } from './evaluation/evaluation.service';
import { EvaluationVoteRepository } from './evaluation/evaluation-vote.repository';
import { EVALUATION_VOTE } from './evaluation/interfaces/evaluation-vote.interface';

@Module({
  imports: [
    WaitingModule,
    ChatModule,
    RedisModule,
    ItemModule,
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
    DrawingService,
    EvaluationService,
    { provide: GAME_STATE_STORE, useClass: GameStateStore },
    { provide: GAME_EVENT_PUBLISHER, useExisting: GameGateway },
    DrawingGateway,
    DrawingStore,
    DrawingRepository,
    {
      provide: DRAWING_REPO,
      useClass: DrawingRepository,
    },
    GameItemGateway,
    GameItemService,
    CooldownStore,
    GameInventoryStore,
    EvaluationGateway,
    EvaluationService,
    { provide: EVALUATION_VOTE, useClass: EvaluationVoteRepository },
  ],
  exports: [],
})
export class GameModule {}
