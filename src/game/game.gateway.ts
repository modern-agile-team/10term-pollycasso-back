import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { IGameEventPublisher } from './interfaces/game-event-publisher.interfaces';
import { Server } from 'socket.io';
import { wsError } from 'src/common/utils/ws-error.util';
import { forwardRef, Inject, Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { WAITING_ERROR_CODES } from 'src/waiting/constants/waiting.constant';
import { WaitingStore } from 'src/waiting/waiting.store';
import { GameJoinDto } from './dto/requests/game-join.dto';
import { GAME_ERRORS, GAME_EVENTS } from './constants/game.constant';
import type { GameSocket } from './interfaces/gameSocket.interface';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { requireRoomId, requireUserId } from './utils/game-ws.util';
import {
  GAME_STATE_STORE,
  GamePhase,
  type IGameStateStore,
} from 'src/game-state/interfaces/game-state.interface';
import { GameSessionService } from './session/game-session.service';
import { RoundSummaryService } from './round-summary/round-summary.service';
import { EvaluationService } from './evaluation/evaluation.service';
import { RoomUpdatePlayerPayload } from './interfaces/game.interface';

@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) => {
      throw wsError(
        400,
        WAITING_ERROR_CODES.INVALID_INPUT,
        errors.map((e) => ({
          field: e.property,
          reason: Object.values(e.constraints ?? {}),
        })),
      );
    },
  }),
)
@UseFilters(SocketExceptionFilter)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
  namespace: '/game',
})
export class GameGateway implements IGameEventPublisher, OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameGateway.name);

  constructor(
    @Inject(forwardRef(() => RoundSummaryService))
    private readonly waitingState: WaitingStore,
    private readonly jwtService: JwtService,
    private readonly evaluationService: EvaluationService,
    private readonly roundSummaryService: RoundSummaryService,
    private readonly gameSessionService: GameSessionService,
    @Inject(GAME_STATE_STORE) private readonly gameStateStore: IGameStateStore,
  ) {}

  async handleConnection(client: GameSocket) {
    const auth = client.handshake.auth ?? {};
    const headers = client.handshake.headers;

    const token =
      (typeof auth.token === 'string' ? auth.token : null) ||
      (typeof headers.authorization === 'string' ? headers.authorization.split(' ')[1] : null);

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const userId = Number(payload.sub);

      client.data = {
        userId,
        nickname: payload.nickname,
        roomId: null,
        isHost: false,
      };

      await client.join(`user:${userId}`);

      const roomId = await this.waitingState.getCurrentRoom(userId);
      if (roomId) {
        await this.joinGameRoomInternal(client, roomId, false);
      }

      this.logger.log(
        `Connected userId=${userId}, roomId=${client.data.roomId ?? 'none'}, host=${client.data.isHost}`,
      );
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('game:join')
  async onGameJoin(@ConnectedSocket() client: GameSocket, @MessageBody() body: GameJoinDto) {
    const roomId = body.roomId;
    if (!roomId || Number.isNaN(roomId)) {
      const error = wsError(400, GAME_ERRORS.GAME_INVALID_ROOM_ID);
      client.emit(GAME_EVENTS.SYSTEM_NOTIFICATION, error.getError());
      return;
    }

    const userId = client.data?.userId;
    if (!userId) {
      const error = wsError(401, GAME_ERRORS.GAME_UNAUTHORIZED);
      client.emit(GAME_EVENTS.SYSTEM_NOTIFICATION, error.getError());
      client.disconnect();
      return;
    }

    const currentRoom = await this.waitingState.getCurrentRoom(userId);
    if (currentRoom !== roomId) {
      const error = wsError(403, GAME_ERRORS.GAME_ACCESS_DENIED);
      client.emit(GAME_EVENTS.SYSTEM_NOTIFICATION, error.getError());
      return;
    }

    await this.joinGameRoomInternal(client, roomId, true);
  }

  @SubscribeMessage(GAME_EVENTS.ROOM_READY_TOGGLE)
  async onReadyToggle(@ConnectedSocket() client: GameSocket): Promise<void> {
    const userId = requireUserId(client);
    const roomId = requireRoomId(client);

    const gameState = await this.gameStateStore.get(roomId);
    if (!gameState) throw wsError(404, 'GAME_STATE_NOT_FOUND');

    switch (gameState.phase) {
      case GamePhase.EVALUATING: {
        const { isReady, allReady } = await this.evaluationService.toggleReady(
          roomId,
          gameState,
          userId,
        );

        const payload: RoomUpdatePlayerPayload = {
          userId,
          changes: { isReady },
        };

        this.server.to(`game:room:${roomId}`).emit(GAME_EVENTS.ROOM_UPDATE_PLAYER, payload);

        if (allReady) {
          await this.gameSessionService.advanceToRoundSummary({ roomId, server: this.server });
        }
        return;
      }

      case GamePhase.ROUND_SUMMARY: {
        await this.roundSummaryService.handleReadyToggle(this.server, roomId, userId);
        return;
      }

      default: {
        throw wsError(400, GAME_ERRORS.INVALID_PHASE);
      }
    }
  }

  broadcastGameState(roomId: number, payload: any) {
    const roomKey = `game:room:${roomId}`;
    this.server.to(roomKey).emit(GAME_EVENTS.ROOM_UPDATE_GAME_STATE, payload);
  }

  emitThemeConfirmed(roomId: number, currentTheme: string) {
    this.server.to(`game:room:${roomId}`).emit(GAME_EVENTS.GAME_THEME_CONFIRMED, { currentTheme });
  }

  private async joinGameRoomInternal(client: GameSocket, roomId: number, emitAck: boolean) {
    const userId = client.data.userId;

    const prevRoomId = client.data.roomId;
    if (prevRoomId && prevRoomId !== roomId) {
      await client.leave(`game:room:${prevRoomId}`);
    }

    await client.join(`game:room:${roomId}`);

    const hostId = await this.waitingState.getHostId(roomId);
    const isHost = hostId === userId;

    client.data.roomId = roomId;
    client.data.isHost = isHost;

    if (emitAck) {
      client.emit(GAME_EVENTS.GAME_JOINED, { roomId, isHost });
    }

    this.logger.log(`Joined game room userId=${userId}, roomId=${roomId}, host=${isHost}`);
  }
}
