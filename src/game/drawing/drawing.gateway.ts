import { UseFilters } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { DrawingService } from './drawing.service';
import { GameSessionService } from '../session/game-session.service';
import type { Server } from 'socket.io';
import type { GameSocket } from '../interfaces/gameSocket.interface';
import { SendDrawingDto } from './dto/requests/send-drawing.dto';

@UseFilters(SocketExceptionFilter)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
  namespace: '/game',
})
export class DrawingGateway {
  @WebSocketServer() server: Server;

  constructor(
    private readonly drawingService: DrawingService,
    private readonly gameSessionService: GameSessionService,
  ) {}

  private roomSocketRoom(roomId: number) {
    return `game:room:${roomId}`;
  }

  @SubscribeMessage('game:sendDrawing')
  async onSendDrawing(@ConnectedSocket() socket: GameSocket, @MessageBody() body: SendDrawingDto) {
    const userId = socket.data.userId;
    const roomId = socket.data.roomId;
    const { line } = body;

    await this.drawingService.sendDrawingLine({ roomId, userId, line });
  }

  @SubscribeMessage('game:submitDrawing')
  async onSubmitDrawing(@ConnectedSocket() socket: GameSocket) {
    const userId = socket.data.userId;
    const roomId = socket.data.roomId;

    const res = await this.drawingService.submitDrawing({ roomId, userId });

    if (res.playerUpdate) {
      this.server.to(this.roomSocketRoom(roomId)).emit('room:updatePlayer', res.playerUpdate);
    }

    if (res.shouldAdvance) {
      await this.gameSessionService.advanceToEvaluating({ roomId, server: this.server });
    }

    return { ok: true, shouldAdvance: res.shouldAdvance };
  }

  async handleDisconnect(socket: GameSocket) {
    const userId = socket.data.userId;
    const roomId = socket.data.roomId;

    const res = await this.drawingService.handleDisconnect({ roomId, userId });

    if (res.playerUpdate) {
      this.server.to(this.roomSocketRoom(roomId)).emit('room:updatePlayer', res.playerUpdate);
    }

    if (res.shouldAdvance) {
      await this.gameSessionService.advanceToEvaluating({ roomId, server: this.server });
    }
  }
}
