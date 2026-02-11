import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, UseFilters } from '@nestjs/common';
import { Server } from 'socket.io';

import {
  GAME_STATE_STORE,
  type IGameStateStore,
} from '../../game-state/interfaces/game-state.interface';

import { EvaluationService } from './evaluation.service';
import type { AckResponse, EvaluationSubmitPayload } from './interfaces/evaluation.interface';
import { EVALUATION_EVENTS } from './constants/evaluation.constant';
import type { GameSocket } from '../interfaces/gameSocket.interface';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { GameSessionService } from '../session/game-session.service';

@UseFilters(SocketExceptionFilter)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
  namespace: '/game',
})
export class EvaluationGateway {
  @WebSocketServer() server: Server;

  constructor(
    private readonly evalService: EvaluationService,
    private readonly gameSessionService: GameSessionService,
    @Inject(GAME_STATE_STORE) private readonly store: IGameStateStore,
  ) {}

  private notify(client: GameSocket, payload: { status: number; code: string; errors?: any[] }) {
    client.emit(EVALUATION_EVENTS.SYSTEM_NOTIFICATION, payload);
  }

  @SubscribeMessage(EVALUATION_EVENTS.GAME_SUBMIT_EVALUATION)
  async onSubmitEval(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() payload: EvaluationSubmitPayload,
  ): Promise<AckResponse> {
    const roomId = client.data.roomId;
    const userId = client.data.userId;
    if (roomId == null || userId == null) return { ok: false, code: 'CONTEXT_INVALID' };

    const gs = await this.store.get(roomId);
    if (!gs) return { ok: false, code: 'GAME_STATE_NOT_FOUND' };

    return this.evalService.submitEvaluation(roomId, gs, userId, payload);
  }

  @SubscribeMessage(EVALUATION_EVENTS.ROOM_READY_TOGGLE)
  async onReadyToggle(@ConnectedSocket() client: GameSocket): Promise<AckResponse> {
    const roomId = client.data.roomId;
    const userId = client.data.userId;
    if (roomId == null || userId == null) return { ok: false, code: 'CONTEXT_INVALID' };

    const gs = await this.store.get(roomId);
    if (!gs) return { ok: false, code: 'GAME_STATE_NOT_FOUND' };

    const res = await this.evalService.toggleReady(roomId, gs, userId);

    if (!res.ok) {
      this.notify(client, {
        status: 400,
        code: res.code ?? 'UNKNOWN_ERROR',
        errors: [],
      });
      return res;
    }

    if (res.allReady) {
      await this.gameSessionService.advanceToRoundSummary({ roomId, server: this.server });
    }

    return res;
  }
}
