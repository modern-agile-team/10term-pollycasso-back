import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe, UseFilters, Inject } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { SendMessageDto } from './dtos/requests/send-message.dto';
import { CHAT_ERROR_CODES } from './constants/chat.constant';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { wsError } from 'src/common/utils/ws-error.util';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

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
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

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

  handleConnection(client: Socket) {
    const auth = client.handshake.auth ?? {};
    const headers = client.handshake.headers;

    const token =
      (typeof auth.token === 'string' ? auth.token : null) ||
      (typeof headers.authorization === 'string' ? headers.authorization.split(' ')[1] : null);

    if (!token) {
      const error = wsError(401, CHAT_ERROR_CODES.ACCESS_TOKEN_MISSING);
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

      void client.join('lobby');
      this.logger.log(`User connected: ${payload.nickname}`);
    } catch (err: unknown) {
      const isTokenExpired = err instanceof Error && err.name === 'TokenExpiredError';

      const error = wsError(
        401,
        isTokenExpired
          ? CHAT_ERROR_CODES.EXPIRED_ACCESS_TOKEN
          : CHAT_ERROR_CODES.INVALID_ACCESS_TOKEN,
      );

      client.emit('system:notification', error.getError());
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const data = this.getClientData(client);
    this.logger.log(`User disconnected: ${data?.nickname ?? 'Unknown'}`);
  }

  @SubscribeMessage('lobby:send')
  handleLobbyMessage(@MessageBody() data: SendMessageDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);

    if (!clientData) {
      throw wsError(400, CHAT_ERROR_CODES.CLIENT_STATE_INVALID);
    }

    try {
      const message = this.chatService.createLobbyMessage({
        senderId: clientData.userId.toString(),
        nickname: clientData.nickname,
        message: data.message,
      });

      void this.server.to('lobby').emit('lobby:message', message);
    } catch (_error) {
      throw wsError(500, CHAT_ERROR_CODES.MESSAGE_SEND_FAILED);
    }
  }
}
