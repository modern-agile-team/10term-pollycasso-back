import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WaitingService } from './waiting.service';
import { UseFilters, UsePipes, ValidationPipe, Inject } from '@nestjs/common';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import {
  WAITING_ERROR_CODES,
  WAITING_EVENTS,
  WAITING_CONSTANTS,
} from './constants/waiting.constant';
import { wsError } from 'src/common/utils/ws-error.util';
import { SendMessageDto } from 'src/chat/dtos/requests/send-message.dto';
import { ChatService } from 'src/chat/chat.service';
import { JwtService } from '@nestjs/jwt';
import { JoinRoomDto } from './dtos/requests/join-room.dto';
import { ChangeTeamDto } from './dtos/requests/change-team.dto';
import { UpdateStatusDto } from './dtos/requests/update-status.dto';
import { UpdateOutfitDto } from './dtos/requests/update-outfit.dto';
import { UpdateSettingsDto } from './dtos/requests/update-settings.dto';
import { KickUserDto } from './dtos/requests/kick-user.dto';
import { NudgeUserDto } from './dtos/requests/nudge-user.dto';
import { GameStateStore } from 'src/game-state/game-state.store';
import { GamePhase } from 'src/game-state/interfaces/game-state.interface';
import { WaitingPlayerState } from './waiting.store';

interface JwtPayload {
  sub: string;
  nickname: string;
}

interface ClientData {
  userId: number;
  nickname: string;
  roomId?: number;
}

@UseFilters(SocketExceptionFilter)
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
@WebSocketGateway({
  namespace: '/waiting',
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
})
export class WaitingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly waitingService: WaitingService,
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly gameStateStore: GameStateStore,
  ) {}

  handleConnection(client: Socket) {
    const auth = client.handshake.auth ?? {};
    const headers = client.handshake.headers;
    const token =
      (typeof auth.token === 'string' ? auth.token : null) ||
      (typeof headers.authorization === 'string' ? headers.authorization.split(' ')[1] : null);

    if (!token) {
      const error = wsError(401, WAITING_ERROR_CODES.ACCESS_TOKEN_MISSING);
      client.emit(WAITING_EVENTS.SYSTEM_NOTIFICATION, error.getError());
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data = {
        userId: Number(payload.sub),
        nickname: payload.nickname,
      };
      this.logger.log(`User connected: ${payload.nickname}`);
    } catch (err: unknown) {
      const isTokenExpired = err instanceof Error && err.name === 'TokenExpiredError';
      const error = wsError(
        401,
        isTokenExpired
          ? WAITING_ERROR_CODES.EXPIRED_ACCESS_TOKEN
          : WAITING_ERROR_CODES.INVALID_ACCESS_TOKEN,
      );
      client.emit(WAITING_EVENTS.SYSTEM_NOTIFICATION, error.getError());
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const data = client.data as ClientData;

    if (!data?.userId || !data?.roomId) {
      this.logger.log(`User disconnected: ${client.id}`);
      return;
    }

    const result = await this.waitingService.handleDisconnect(data.roomId, data.userId);

    if (!result.wasLastPlayer && !result.isGameInProgress) {
      this.emitPlayerListSync(data.roomId, result.remainingPlayers);

      if (result.systemMessage) {
        this.server
          .to(`room:${data.roomId}`)
          .emit(WAITING_EVENTS.ROOM_SYSTEM_MESSAGE, result.systemMessage);
      }
    }
  }

  private getClientData(client: Socket): ClientData | null {
    const data = client.data as unknown;
    if (
      data &&
      typeof data === 'object' &&
      'userId' in data &&
      typeof data.userId === 'number' &&
      'nickname' in data &&
      typeof data.nickname === 'string'
    ) {
      return data as ClientData;
    }
    return null;
  }

  private emitPlayerListSync(roomId: number, players: WaitingPlayerState[] | unknown[]) {
    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_SYNC_PLAYER_LIST, {
      players,
    });
  }

  private emitSystemMessage(roomId: number, message: string) {
    const systemMessage = this.chatService.createSystemMessage({ message });
    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_SYSTEM_MESSAGE, systemMessage);
  }

  @SubscribeMessage(WAITING_EVENTS.ROOM_JOIN)
  async handleJoin(@MessageBody() body: JoinRoomDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    if (clientData.roomId && clientData.roomId !== body.roomId) {
      const previousRoomId = clientData.roomId;
      const playersBeforeLeave = await this.waitingService.getPlayers(previousRoomId);
      const previousRoomId = clientData.roomId;
      const playersBeforeLeave = await this.waitingService.getPlayers(previousRoomId);

      await this.waitingService.leaveRoom(previousRoomId, clientData.userId);
      await client.leave(`room:${previousRoomId}`);
      await this.waitingService.leaveRoom(previousRoomId, clientData.userId);
      await client.leave(`room:${previousRoomId}`);

      if (playersBeforeLeave.length > 1) {
        const players = await this.waitingService.getPlayers(previousRoomId);
        this.emitPlayerListSync(previousRoomId, players);
      }
    }

    const state = await this.waitingService.joinRoom(body.roomId, clientData.userId, body.password);

    (client.data as ClientData).roomId = body.roomId;
    await client.join(`room:${body.roomId}`);

    this.emitPlayerListSync(body.roomId, state.players);
    this.emitSystemMessage(body.roomId, `${clientData.nickname}님이 입장했습니다.`);

    client.emit(WAITING_EVENTS.ROOM_JOIN_SUCCESS, state);
  }

  @SubscribeMessage(WAITING_EVENTS.ROOM_READY_TOGGLE)
  async handleReadyToggle(@ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;
    const isReady = await this.waitingService.toggleReady(roomId, userId);

    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_UPDATE_PLAYER, {
      userId: userId.toString(),
      changes: { isReady },
    });

    const allReady = await this.waitingService.canStartMatch(roomId);
    if (allReady) {
      this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_ALL_PLAYERS_READY, {
        canStart: true,
      });
    }
  }

  @SubscribeMessage(WAITING_EVENTS.ROOM_CHANGE_TEAM)
  async handleChangeTeam(@MessageBody() body: ChangeTeamDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;
    await this.waitingService.changeTeam(roomId, userId, body.targetTeam);

    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_UPDATE_PLAYER, {
      userId: userId.toString(),
      changes: { team: body.targetTeam },
    });
  }

  @SubscribeMessage(WAITING_EVENTS.ROOM_UPDATE_STATUS)
  async handleUpdateStatus(
    @MessageBody() body: UpdateStatusDto,
    @ConnectedSocket() client: Socket,
  ) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;
    await this.waitingService.updatePageStatus(roomId, userId, body.status);

    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_UPDATE_PLAYER, {
      userId: userId.toString(),
      changes: { status: body.status },
    });
  }

  @SubscribeMessage(WAITING_EVENTS.ROOM_UPDATE_OUTFIT)
  async handleUpdateOutfit(
    @MessageBody() body: UpdateOutfitDto,
    @ConnectedSocket() client: Socket,
  ) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;
    await this.waitingService.updateOutfit(roomId, userId, body.outfit);

    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_UPDATE_PLAYER, {
      userId: userId.toString(),
      changes: { outfit: body.outfit },
    });
  }

  @SubscribeMessage(WAITING_EVENTS.ROOM_UPDATE_SETTINGS)
  async handleUpdateSettings(
    @MessageBody() body: UpdateSettingsDto,
    @ConnectedSocket() client: Socket,
  ) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;
    await this.waitingService.updateSettings(roomId, userId, body);

    const state = await this.waitingService.getState(roomId);

    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_UPDATE_ROOM, {
      roomSettings: state.settings,
    });

    this.emitPlayerListSync(roomId, state.players);
    this.emitSystemMessage(roomId, '게임 설정이 변경되었습니다.');
  }

  @SubscribeMessage(WAITING_EVENTS.ROOM_KICK_USER)
  async handleKick(@MessageBody() body: KickUserDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;

    const playersBeforeKick = await this.waitingService.getPlayers(roomId);
    const kickedPlayer = playersBeforeKick.find((p) => p.userId === body.targetUserId);

    if (!kickedPlayer) {
      throw wsError(404, WAITING_ERROR_CODES.PLAYER_NOT_FOUND);
    }

    await this.waitingService.kickPlayer(roomId, userId, body.targetUserId);

    const targetClients = await this.server.in(`room:${roomId}`).fetchSockets();
    const targetClient = targetClients.find(
      (c) => (c.data as ClientData).userId === body.targetUserId,
    );

    if (targetClient) {
      (targetClient.data as ClientData).roomId = undefined;

      const error = wsError(403, WAITING_ERROR_CODES.ROOM_KICKED);
      targetClient.emit(WAITING_EVENTS.SYSTEM_NOTIFICATION, error.getError());

      targetClient.leave(`room:${roomId}`);
      targetClient.disconnect();
    }

    const players = await this.waitingService.getPlayers(roomId);
    this.emitPlayerListSync(roomId, players);
    this.emitSystemMessage(roomId, `${kickedPlayer.nickname}님이 강퇴되었습니다.`);
  }

  @SubscribeMessage(WAITING_EVENTS.ROOM_NUDGE_USER)
  async handleNudge(@MessageBody() body: NudgeUserDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;

    const players = await this.waitingService.getPlayers(roomId);
    const targetPlayer = players.find((p) => p.userId === body.targetUserId);
    if (!targetPlayer) {
      throw wsError(404, WAITING_ERROR_CODES.PLAYER_NOT_FOUND);
    }

    const targetClients = await this.server.in(`room:${roomId}`).fetchSockets();
    const targetClient = targetClients.find(
      (c) => (c.data as ClientData).userId === body.targetUserId,
    );

    if (targetClient) {
      targetClient.emit(WAITING_EVENTS.ROOM_NUDGED, {
        senderId: userId.toString(),
      });
    }
  }

  @SubscribeMessage(WAITING_EVENTS.GAME_START_REQUEST)
  async handleStartRequest(@ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;

    await this.waitingService.startGame(roomId, userId);

    await this.waitingService.markRoomAsStarted(roomId);

    const loadingEndTime = Date.now() + WAITING_CONSTANTS.LOADING_PHASE_DURATION_MS;
    await this.gameStateStore.set(roomId, {
      phase: GamePhase.LOADING,
      endsAt: loadingEndTime,
      currentRound: 1,
      totalRounds: WAITING_CONSTANTS.DEFAULT_ROUNDS,
      currentTheme: null,
      recentThemes: [],
      phaseContext: null,
    });

    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_UPDATE_GAME_STATE, {
      phase: GamePhase.LOADING,
      endsAt: loadingEndTime,
      phaseContext: null,
    });
  }

  @SubscribeMessage(WAITING_EVENTS.ROOM_LEAVE)
  async handleLeave(@ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;
    const result = await this.waitingService.handleLeave(roomId, userId);
    await client.leave(`room:${roomId}`);

    if (!result.wasLastPlayer) {
      this.emitPlayerListSync(roomId, result.remainingPlayers);

      if (result.systemMessage) {
        this.server
          .to(`room:${roomId}`)
          .emit(WAITING_EVENTS.ROOM_SYSTEM_MESSAGE, result.systemMessage);
      }
    }

    client.emit(WAITING_EVENTS.ROOM_LEAVE, { success: true });
    (client.data as ClientData).roomId = undefined;
  }

  @SubscribeMessage(WAITING_EVENTS.ROOM_SEND)
  async handleSendMessage(@MessageBody() body: SendMessageDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;
    const players = await this.waitingService.getPlayers(roomId);
    const player = players.find((p) => p.userId === userId);

    if (!player) {
      throw wsError(404, WAITING_ERROR_CODES.PLAYER_NOT_FOUND);
    }

    const message = this.chatService.createLobbyMessage({
      senderId: userId.toString(),
      nickname: player.nickname,
      message: body.message,
    });

    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_MESSAGE, message);
  }
}
