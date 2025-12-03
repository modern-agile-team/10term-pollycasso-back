import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { SendMessageDto } from './dtos/requests/send-message.dto';
import { UsePipes, ValidationPipe, Logger } from '@nestjs/common';

interface JwtPayload {
  sub: string;
  nickname: string;
}

interface ClientData {
  userId: string;
  nickname: string;
}

@UsePipes(new ValidationPipe({ exceptionFactory: (errors) => new WsException(errors) }))
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  private getClientData(client: Socket): ClientData | null {
    return (client.data as ClientData) ?? null;
  }

  handleConnection(client: Socket) {
    const auth = client.handshake.auth as Record<string, unknown>;
    const headers = client.handshake.headers as Record<string, unknown>;

    const token =
      (typeof auth.token === 'string' ? auth.token : null) ||
      (typeof headers.authorization === 'string' ? headers.authorization.split(' ')[1] : null);

    if (!token) {
      this.logger.warn(`Connection rejected: No token provided (client: ${client.id})`);
      client.emit('error', { message: 'No token provided' });
      return client.disconnect();
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      client.data = {
        userId: payload.sub,
        nickname: payload.nickname,
      };

      void client.join('lobby');
      this.logger.log(`User connected: ${payload.nickname} (client: ${client.id})`);
    } catch (_err: unknown) {
      this.logger.warn(`Connection rejected: Invalid token (client: ${client.id})`);
      client.emit('error', { message: 'Invalid token' });
      return client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientData = this.getClientData(client);
    const nickname = clientData?.nickname;
    this.logger.log(`User disconnected: ${nickname} (client: ${client.id})`);
  }

  @SubscribeMessage('lobby:send')
  handleLobbyMessage(@MessageBody() data: SendMessageDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);

    if (!clientData) {
      this.logger.error(`Invalid client state (client: ${client.id})`);
      client.emit('error', { message: 'Client state invalid' });
      return;
    }

    try {
      const message = this.chatService.createLobbyMessage({
        senderId: clientData.userId,
        nickname: clientData.nickname,
        message: data.message,
      });

      void this.server.to('lobby').emit('lobby:message', message);
      this.logger.debug(`Message sent to lobby by ${clientData.nickname}: ${data.message}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to send message (client: ${client.id})`, error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }
}
