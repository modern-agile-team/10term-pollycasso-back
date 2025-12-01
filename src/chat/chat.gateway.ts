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
import { UsePipes, ValidationPipe } from '@nestjs/common';

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
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'https://www.pollycasso.com'],
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
  ) {}

  private getClientData(client: Socket): ClientData | null {
    return (client.data as ClientData) ?? null;
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth.token as string | undefined;

    if (!token) {
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
    } catch (_err: unknown) {
      client.emit('error', { message: 'Invalid token' });
      return client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('lobby:send')
  handleLobbyMessage(@MessageBody() data: SendMessageDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);
    if (!clientData) {
      throw new WsException('Client state invalid');
    }

    const message = this.chatService.createLobbyMessage({
      senderId: clientData.userId,
      nickname: clientData.nickname,
      message: data.message,
    });

    void this.server.to('lobby').emit('lobby:message', message);
  }
}
