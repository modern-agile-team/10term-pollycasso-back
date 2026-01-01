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
import { UseFilters, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { WAITING_ERROR_CODES } from './constants/waiting.constant';
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
  private readonly logger = new Logger(WaitingGateway.name);

  constructor(
    private readonly waitingService: WaitingService,
    private readonly chatService: ChatService,
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
      client.emit('system:notification', error.getError());
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data = {
        userId: Number(payload.sub),
        nickname: payload.nickname,
      };
      this.logger.log(`User connected: ${payload.nickname} (${client.id})`);
    } catch (err: unknown) {
      const isTokenExpired = err instanceof Error && err.name === 'TokenExpiredError';
      const error = wsError(
        401,
        isTokenExpired
          ? WAITING_ERROR_CODES.EXPIRED_ACCESS_TOKEN
          : WAITING_ERROR_CODES.INVALID_ACCESS_TOKEN,
      );
      client.emit('system:notification', error.getError());
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const data = client.data as ClientData;

    if (!data?.userId || !data?.roomId) {
      this.logger.log(`Client disconnected: ${client.id}`);
      return;
    }

    try {
      const playersBeforeLeave = await this.waitingService.getPlayers(data.roomId);
      const wasLastPlayer = playersBeforeLeave.length === 1;
      const leavingPlayer = playersBeforeLeave.find((p) => p.userId === data.userId);

      await this.waitingService.leaveRoom(data.roomId, data.userId);

      if (!wasLastPlayer) {
        this.server.to(`room:${data.roomId}`).emit('room:syncPlayerList', {
          players: await this.waitingService.getPlayers(data.roomId),
        });

        if (leavingPlayer) {
          const systemMessage = this.chatService.createSystemMessage({
            message: `${leavingPlayer.nickname}님이 퇴장했습니다.`,
          });
          this.server.to(`room:${data.roomId}`).emit('chat:systemMessage', systemMessage);
        }
      }

      this.logger.debug(`User ${data.userId} left room ${data.roomId}`);
    } catch (error) {
      this.logger.error('Error handling disconnect:', error);
    }
  }

  private getClientData(client: Socket): ClientData | null {
    if (
      client.data &&
      typeof client.data === 'object' &&
      'userId' in client.data &&
      'nickname' in client.data
    ) {
      return client.data as ClientData;
    }
    return null;
  }

  @SubscribeMessage('room:join')
  async handleJoin(@MessageBody() body: JoinRoomDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    if (clientData.roomId && clientData.roomId !== body.roomId) {
      try {
        const previousRoomId = clientData.roomId;
        const playersBeforeLeave = await this.waitingService.getPlayers(previousRoomId);

        await this.waitingService.leaveRoom(previousRoomId, clientData.userId);
        await client.leave(`room:${previousRoomId}`);

        if (playersBeforeLeave.length > 1) {
          this.server.to(`room:${previousRoomId}`).emit('room:syncPlayerList', {
            players: await this.waitingService.getPlayers(previousRoomId),
          });
        }

        this.logger.debug(`User ${clientData.userId} left previous room ${previousRoomId}`);
      } catch (error) {
        this.logger.warn(`Failed to leave previous room: ${error}`);
      }
    }

    const state = await this.waitingService.joinRoom(body.roomId, clientData.userId, body.password);

    (client.data as ClientData).roomId = body.roomId;
    await client.join(`room:${body.roomId}`);

    this.server.to(`room:${body.roomId}`).emit('room:syncPlayerList', {
      players: state.players,
    });

    const systemMessage = this.chatService.createSystemMessage({
      message: `${clientData.nickname}님이 입장했습니다.`,
    });
    this.server.to(`room:${body.roomId}`).emit('chat:systemMessage', systemMessage);

    client.emit('room:join', state);
    this.logger.debug(`User ${clientData.userId} joined room ${body.roomId}`);
  }

  @SubscribeMessage('room:readyToggle')
  async handleReadyToggle(@ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;
    const isReady = await this.waitingService.toggleReady(roomId, userId);

    this.server.to(`room:${roomId}`).emit('room:updatePlayer', {
      userId: userId.toString(),
      changes: { isReady },
    });

    const allReady = await this.waitingService.canStartMatch(roomId);
    if (allReady) {
      this.server.to(`room:${roomId}`).emit('room:allPlayersReady', {
        canStart: true,
      });
    }
  }

  @SubscribeMessage('room:changeTeam')
  async handleChangeTeam(@MessageBody() body: ChangeTeamDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;
    await this.waitingService.changeTeam(roomId, userId, body.targetTeam);

    this.server.to(`room:${roomId}`).emit('room:updatePlayer', {
      userId: userId.toString(),
      changes: { team: body.targetTeam },
    });
  }

  @SubscribeMessage('room:updateStatus')
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

    this.server.to(`room:${roomId}`).emit('room:updatePlayer', {
      userId: userId.toString(),
      changes: { pageStatus: body.status },
    });
  }

  @SubscribeMessage('room:updateOutfit')
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

    this.server.to(`room:${roomId}`).emit('room:updatePlayer', {
      userId: userId.toString(),
      changes: { outfit: body.outfit },
    });
  }

  @SubscribeMessage('room:updateSettings')
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

    this.server.to(`room:${roomId}`).emit('room:updateRoom', {
      roomSettings: state.settings,
    });

    this.server.to(`room:${roomId}`).emit('room:syncPlayerList', {
      players: state.players,
    });

    const systemMessage = this.chatService.createSystemMessage({
      message: '게임 설정이 변경되었습니다.',
    });
    this.server.to(`room:${roomId}`).emit('chat:systemMessage', systemMessage);
  }

  @SubscribeMessage('room:kickUser')
  async handleKick(@MessageBody() body: KickUserDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;

    const playersBeforeKick = await this.waitingService.getPlayers(roomId);
    const kickedPlayer = playersBeforeKick.find((p) => p.userId === body.targetUserId);

    await this.waitingService.kickPlayer(roomId, userId, body.targetUserId);

    const targetClients = await this.server.in(`room:${roomId}`).fetchSockets();
    const targetClient = targetClients.find(
      (c) => (c.data as ClientData).userId === body.targetUserId,
    );

    if (targetClient) {
      (targetClient.data as ClientData).roomId = undefined;

      targetClient.emit('system:notification', {
        status: 403,
        code: 'ROOM_KICKED',
        errors: [],
      });

      targetClient.leave(`room:${roomId}`);
      targetClient.disconnect();
    }

    this.server.to(`room:${roomId}`).emit('room:syncPlayerList', {
      players: await this.waitingService.getPlayers(roomId),
    });

    if (kickedPlayer) {
      const systemMessage = this.chatService.createSystemMessage({
        message: `${kickedPlayer.nickname}님이 강퇴되었습니다.`,
      });
      this.server.to(`room:${roomId}`).emit('chat:systemMessage', systemMessage);
    }
  }

  @SubscribeMessage('room:nudgeUser')
  async handleNudge(@MessageBody() body: NudgeUserDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;

    const targetClients = await this.server.in(`room:${roomId}`).fetchSockets();
    const targetClient = targetClients.find(
      (c) => (c.data as ClientData).userId === body.targetUserId,
    );

    if (targetClient) {
      targetClient.emit('room:nudged', {
        senderId: userId.toString(),
      });
    }
  }

  @SubscribeMessage('game:startRequest')
  async handleStartRequest(@ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;
    await this.waitingService.startGame(roomId, userId);

    const state = await this.waitingService.getState(roomId);

    this.server.to(`room:${roomId}`).emit('room:updateGameState', {
      status: state.status,
      endsAt: Date.now() + 5000,
      phaseContext: null,
    });

    await this.waitingService.markRoomAsStarted(roomId);
  }

  @SubscribeMessage('room:leave')
  async handleLeave(@ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData?.roomId) {
      throw wsError(400, WAITING_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    const { roomId, userId } = clientData;
    const players = await this.waitingService.getPlayers(roomId);
    const wasLastPlayer = players.length === 1;
    const leavingPlayer = players.find((p) => p.userId === userId);

    await this.waitingService.leaveRoom(roomId, userId);
    await client.leave(`room:${roomId}`);

    if (!wasLastPlayer) {
      this.server.to(`room:${roomId}`).emit('room:syncPlayerList', {
        players: await this.waitingService.getPlayers(roomId),
      });

      if (leavingPlayer) {
        const systemMessage = this.chatService.createSystemMessage({
          message: `${leavingPlayer.nickname}님이 퇴장했습니다.`,
        });
        this.server.to(`room:${roomId}`).emit('chat:systemMessage', systemMessage);
      }
    }

    client.emit('room:leave', { success: true });
    (client.data as ClientData).roomId = undefined;

    this.logger.debug(`User ${userId} left room ${roomId}`);
  }

  @SubscribeMessage('room:send')
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

    this.server.to(`room:${roomId}`).emit('room:message', message);

    this.logger.debug(`Message sent in room ${roomId} by ${player.nickname}: ${body.message}`);
  }
}
