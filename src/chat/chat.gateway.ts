import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { SendMessageDto } from './dtos/requests/send-message.dto';

interface JwtPayload {
  sub: string;
  nickname: string;
}

interface ClientData {
  userId: string;
  nickname: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  private getClientData(client: Socket): ClientData {
    if (!client.data) {
      client.data = { userId: '', nickname: '' };
    }
    return client.data as ClientData;
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth.token as string | undefined;

    if (!token) {
      void client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const clientData = this.getClientData(client);
      clientData.userId = payload.sub;
      clientData.nickname = payload.nickname;

      void client.join('lobby');
    } catch (_err: unknown) {
      void client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.getClientData(client);
  }

  @SubscribeMessage('lobby:public:send')
  handleLobbyMessage(@MessageBody() data: SendMessageDto, @ConnectedSocket() client: Socket) {
    const clientData = this.getClientData(client);

    const message = this.chatService.createLobbyMessage({
      senderId: clientData.userId,
      nickname: clientData.nickname,
      message: data.message,
    });

    void this.server.to('lobby').emit('lobby:public:message', message);
  }
}
