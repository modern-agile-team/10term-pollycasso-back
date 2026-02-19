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
import { EVALUATION_ERRORS, EVALUATION_EVENTS } from './constants/evaluation.constant';
import type { GameSocket } from '../interfaces/gameSocket.interface';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { GameSessionService } from '../session/game-session.service';
import { SubmitEvaluationDto } from './dto/requests/submit-evaluation.dto';
import { requireRoomId, requireUserId } from '../utils/game-ws.util';
import { wsError } from 'src/common/utils/ws-error.util';

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
    @Inject(GAME_STATE_STORE) private readonly gameStateStore: IGameStateStore,
  ) {}

  @SubscribeMessage(EVALUATION_EVENTS.GAME_SUBMIT_EVALUATION)
  async onSubmitEval(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() payload: SubmitEvaluationDto,
  ): Promise<void> {
    const userId = requireUserId(client);
    const roomId = requireRoomId(client);

    const gameState = await this.gameStateStore.get(roomId);
    if (!gameState) throw wsError(404, EVALUATION_ERRORS.GAME_STATE_NOT_FOUND);

    await this.evalService.submitEvaluation(roomId, gameState, userId, payload);
  }
}
