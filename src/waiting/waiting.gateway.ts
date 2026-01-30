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
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { WAITING_ERROR_CODES, WAITING_EVENTS } from './constants/waiting.constant';
import { wsError } from 'src/common/utils/ws-error.util';
import { SendMessageDto } from 'src/chat/dtos/requests/send-message.dto';
import { JwtService } from '@nestjs/jwt';
import { JoinRoomDto } from './dtos/requests/join-room.dto';
import { ChangeTeamDto } from './dtos/requests/change-team.dto';
import { UpdateStatusDto } from './dtos/requests/update-status.dto';
import { UpdateOutfitDto } from './dtos/requests/update-outfit.dto';
import { UpdateSettingsDto } from './dtos/requests/update-settings.dto';
import { KickUserDto } from './dtos/requests/kick-user.dto';
import { NudgeUserDto } from './dtos/requests/nudge-user.dto';
import { PlayerResponseDto } from './dtos/responses/player-response.dto';
import { parseOutfit } from 'src/common/utils/parse-outfit.util';

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
    private readonly jwtService: JwtService,
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
    const data = this.getClientData(client);

    if (!data?.userId || !data?.roomId) {
      return;
    }

    const result = await this.waitingService.handleDisconnect(data.roomId, data.userId);

    if (!result.wasLastPlayer && !result.isGameInProgress) {
      this.emitPlayerListSync(data.roomId, result.players);

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

  private emitPlayerListSync(roomId: number, players: PlayerResponseDto[]) {
    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_SYNC_PLAYER_LIST, {
      players,
    });
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

      await this.waitingService.leaveRoom(previousRoomId, clientData.userId);
      await client.leave(`room:${previousRoomId}`);

      if (playersBeforeLeave.length > 1) {
        const players = await this.waitingService.getPlayerResponses(previousRoomId);
        this.emitPlayerListSync(previousRoomId, players);
      }
    }

    const { state, systemMessage } = await this.waitingService.joinRoom(
      body.roomId,
      clientData.userId,
      body.password,
    );

    (client.data as ClientData).roomId = body.roomId;
    await client.join(`room:${body.roomId}`);

    const players = await this.waitingService.getPlayerResponses(body.roomId);
    this.emitPlayerListSync(body.roomId, players);

    this.server.to(`room:${body.roomId}`).emit(WAITING_EVENTS.ROOM_SYSTEM_MESSAGE, systemMessage);

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

    const players = await this.waitingService.getPlayers(roomId);
    const player = players.find((p) => p.userId === userId);
    if (!player) {
      throw wsError(404, WAITING_ERROR_CODES.PLAYER_NOT_FOUND);
    }

    const nextOutfit = parseOutfit({
      ...player.outfit,
      ...body.outfit,
    });

    await this.waitingService.updateOutfit(roomId, userId, nextOutfit);

    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_UPDATE_PLAYER, {
      userId: userId.toString(),
      changes: { outfit: nextOutfit },
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
    const { players, systemMessage } = await this.waitingService.updateSettings(
      roomId,
      userId,
      body,
    );

    const settings = await this.waitingService.getRoomSettings(roomId);

    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_UPDATE_ROOM, {
      roomSettings: settings,
    });

    this.emitPlayerListSync(roomId, players);
    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_SYSTEM_MESSAGE, systemMessage);
  }

  @SubscribeMessage(WAITING_EVENTS.ROOM_KICK_USER)
  async handleKick(@MessageBody() body: KickUserDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;
    const { players, systemMessage } = await this.waitingService.kickPlayer(
      roomId,
      userId,
      body.targetUserId,
    );

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

    this.emitPlayerListSync(roomId, players);
    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_SYSTEM_MESSAGE, systemMessage);
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
    const { gameState } = await this.waitingService.handleGameStart(roomId, userId);

    this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_UPDATE_GAME_STATE, {
      phase: gameState.phase,
      endsAt: gameState.endsAt,
      phaseContext: gameState.phaseContext,
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
      this.emitPlayerListSync(roomId, result.players);

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
    const result = await this.waitingService.handleChatMessage(
      roomId,
      userId,
      body.message,
      body.channel,
      body.targetId,
    );

    if (result.isDirectMessage) {
      const roomSockets = await this.server.in(`room:${roomId}`).fetchSockets();
      const targetSocket = roomSockets.find(
        (s) => (s.data as ClientData).userId === result.targetUserId,
      );

      if (!targetSocket) {
        throw wsError(404, WAITING_ERROR_CODES.TARGET_OFFLINE);
      }

      client.emit(WAITING_EVENTS.ROOM_MESSAGE, result.message);
      targetSocket.emit(WAITING_EVENTS.ROOM_MESSAGE, result.message);
    } else {
      this.server.to(`room:${roomId}`).emit(WAITING_EVENTS.ROOM_MESSAGE, result.message);
    }
  }
}
