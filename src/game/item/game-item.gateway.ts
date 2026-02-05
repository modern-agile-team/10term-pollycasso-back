import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { GameItemService } from './game-item.service';
import { UseItemDto } from './dto/requests/use-Item.dto';
import { GameSessionService } from '../session/game-session.service';
import type { GameSocket } from '../interfaces/gameSocket.interface';
import { ITEM_ERRORS } from './constant/game-item.constant';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
  namespace: '/game',
})
export class GameItemGateway {
  @WebSocketServer() server: Server;

  constructor(
    private readonly gameItemService: GameItemService,
    private readonly gameSessionService: GameSessionService,
  ) {}

  private getRoomId(socket: GameSocket): number {
    return Number(socket.data.roomId);
  }

  @SubscribeMessage('game:useItem')
  async onUseItem(@ConnectedSocket() socket: GameSocket, @MessageBody() body: UseItemDto) {
    const roomId = this.getRoomId(socket);

    const attackerUserId = Number(socket.data.userId);
    const attackerNickname = String(socket.data.nickname ?? 'unknown');

    const targetUserId = Number(body.targetUserId);
    const itemId = Number(body.itemId);

    let phaseKey: string;
    try {
      phaseKey = await this.gameSessionService.getDrawingPhaseKeyOrThrow(roomId);
    } catch {
      this.server
        .to(`user:${attackerUserId}`)
        .emit('system:notification', { ...ITEM_ERRORS.NOT_ALLOWED_PHASE });
      return;
    }

    try {
      const result = await this.gameItemService.useItemInRoom({
        roomId,
        phaseKey,
        attackerUserId,
        attackerNickname,
        targetUserId,
        itemId,
      });

      this.server.to(`game:room:${roomId}`).emit('game:itemNotification', result.notification);
      this.server.to(`user:${targetUserId}`).emit('game:applyEffect', result.applyEffect);
      this.server.to(`user:${attackerUserId}`).emit('game:inventoryUpdate', result.inventoryUpdate);
    } catch (e) {
      this.server.to(`user:${attackerUserId}`).emit('system:notification', e);
    }
  }
}
