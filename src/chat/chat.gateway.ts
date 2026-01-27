import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe, UseFilters } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { ChatSendChannel, SendMessageDto } from './dtos/requests/send-message.dto';
import { CHAT_ERROR_CODES, CHAT_EVENTS } from './constants/chat.constant';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { wsError } from 'src/common/utils/ws-error.util';

interface JwtPayload {
  sub: string;
  nickname: string;
}

interface ClientData {
  userId: number;
  nickname: string;
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
        CHAT_ERROR_CODES.INVALID_INPUT,
        errors.map((e) => ({
          field: e.property,
          reason: Object.values(e.constraints ?? {}),
        })),
      );
    },
  }),
)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  private getClientData(client: Socket): ClientData | null {
    return client.data && 'userId' in client.data && 'nickname' in client.data
      ? (client.data as ClientData)
      : null;
  }

  handleConnection(client: Socket) {
    const auth = client.handshake.auth ?? {};
    const headers = client.handshake.headers;

    const token =
      (typeof auth.token === 'string' ? auth.token : null) ||
      (typeof headers.authorization === 'string' ? headers.authorization.split(' ')[1] : null);

    if (!token) {
      const error = wsError(401, CHAT_ERROR_CODES.ACCESS_TOKEN_MISSING);
      client.emit(CHAT_EVENTS.SYSTEM_NOTIFICATION, error.getError());
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data = { userId: Number(payload.sub), nickname: payload.nickname };
      void client.join('lobby');
    } catch (err: unknown) {
      const isTokenExpired = err instanceof Error && err.name === 'TokenExpiredError';
      const error = wsError(
        401,
        isTokenExpired
          ? CHAT_ERROR_CODES.EXPIRED_ACCESS_TOKEN
          : CHAT_ERROR_CODES.INVALID_ACCESS_TOKEN,
      );
      client.emit(CHAT_EVENTS.SYSTEM_NOTIFICATION, error.getError());
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage(CHAT_EVENTS.LOBBY_SEND)
  async handleMessage(@MessageBody() dto: SendMessageDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData) throw wsError(400, CHAT_ERROR_CODES.CLIENT_STATE_INVALID);

    try {
      if (dto.channel === ChatSendChannel.GLOBAL) {
        this.handleGlobalMessage(clientData, dto);
      } else if (dto.channel === ChatSendChannel.DIRECT) {
        await this.handleDirectMessage(clientData, dto, client);
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'getError' in error) throw error;
      throw wsError(500, CHAT_ERROR_CODES.MESSAGE_SEND_FAILED);
    }
  }

  private handleGlobalMessage(clientData: ClientData, dto: SendMessageDto): void {
    const message = this.chatService.handleGlobalMessage({
      senderId: clientData.userId.toString(),
      senderNickname: clientData.nickname,
      message: dto.message,
    });

    this.server.to('lobby').emit(CHAT_EVENTS.LOBBY_MESSAGE, message);
  }

  private async handleDirectMessage(
    clientData: ClientData,
    dto: SendMessageDto,
    senderClient: Socket,
  ): Promise<void> {
    if (!dto.targetId) throw wsError(400, CHAT_ERROR_CODES.INVALID_INPUT);

    const targetUserId = Number(dto.targetId);

    const message = await this.chatService.handleDirectMessage({
      senderId: clientData.userId,
      senderNickname: clientData.nickname,
      targetId: targetUserId,
      message: dto.message,
    });

    const targetSocketId = await this.findSocketIdByUserId(targetUserId);
    if (!targetSocketId) throw wsError(404, CHAT_ERROR_CODES.TARGET_OFFLINE);

    senderClient.emit(CHAT_EVENTS.LOBBY_MESSAGE, message);
    this.server.to(targetSocketId).emit(CHAT_EVENTS.LOBBY_MESSAGE, message);
  }
  private async findSocketIdByUserId(userId: number): Promise<string | null> {
    const sockets = await this.server.in('lobby').fetchSockets();
    const targetSocket = sockets.find((s) => (s.data as ClientData).userId === userId);
    return targetSocket?.id ?? null;
  }
}
