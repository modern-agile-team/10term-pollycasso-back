import { Inject, UseFilters } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { TopicService } from './topic.service';
import { GAME_STATE_STORE, GamePhase } from '../interfaces/game-state-store.interfaces';
import type { GameState, IGameStateStore } from '../interfaces/game-state-store.interfaces';
import { TopicDto } from './dtos/requests/topic.dto';
import type { GameSocket } from '../interfaces/gameSocket.interface';
import { GameSessionService } from '../session/game-session.service';

@UseFilters(SocketExceptionFilter)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
  namespace: '/game',
})
export class TopicGateway {
  constructor(
    private readonly topicService: TopicService,
    private readonly gameSessionService: GameSessionService,
    @Inject(GAME_STATE_STORE) private readonly gameStateStore: IGameStateStore,
  ) {}
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('game:typing')
  handleTyping(@ConnectedSocket() client: GameSocket, @MessageBody() data: TopicDto) {
    const { roomId } = client.data;

    if (!roomId) return;

    client.to(`game:room:${roomId}`).emit('game:shareTyping', { value: data.value });
  }

  @SubscribeMessage('game:finalize')
  async handleFinalize(@ConnectedSocket() client: GameSocket, @MessageBody() data: TopicDto) {
    const { roomId, userId } = client.data;
    if (!roomId) return;

    const state = await this.gameStateStore.get(roomId);

    if (!state || state.phase !== GamePhase.THEME_SELECTING) return;

    if (!state.phaseContext || state.phaseContext.kind !== GamePhase.THEME_SELECTING) {
      return;
    }

    if (state.phaseContext.selectorId !== userId) {
      return;
    }

    const inputVal = (data.value || '').trim();

    const currentTheme = inputVal ? inputVal : this.topicService.pickRandomTheme(roomId);

    await this.gameSessionService.startDrawingPhase(roomId, currentTheme);
  }

  @SubscribeMessage('test:setPhase')
  async handleTestPhase(
    @ConnectedSocket() client: GameSocket,
    @MessageBody()
    data: {
      phase: GamePhase;
      selectorId?: number;
      endsInMs?: number;
      currentTheme?: string | null;
    },
  ) {
    const { roomId } = client.data;
    if (!roomId) return;

    const endsAt = data.endsInMs != null ? Date.now() + data.endsInMs : null;

    const patch: Partial<GameState> = {
      phase: data.phase,
      endsAt,
    };

    if (data.phase === GamePhase.THEME_SELECTING) {
      patch.phaseContext = {
        kind: GamePhase.THEME_SELECTING,
        selectorId: data.selectorId ?? client.data.userId, // 기본은 자기 자신
      };
      patch.currentTheme = null;
    } else if (data.phase === GamePhase.DRAWING) {
      patch.phaseContext = null;
      patch.currentTheme = data.currentTheme ?? 'TEST_THEME';
    } else {
      patch.phaseContext = null;
      // 필요하면 다른 phase별 초기화 추가
    }

    const next = await this.gameStateStore.patch(roomId, patch);

    // 테스트할 때 바로 눈에 보이게 브로드캐스트까지
    this.server.to(`game:room:${roomId}`).emit('room:updateGameState', next);

    console.log(`[TEST] Room ${roomId} phase forced to ${data.phase}`);
  }
}
