import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameItemService } from './game-item.service';
import { UseItemDto } from './dto/requests/use-Item.dto';
import { GameSessionService } from '../session/game-session.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
  namespace: '/game',
})
export class GameItemGateway {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly gameItemService: GameItemService,
    private readonly gameSessionService: GameSessionService,
  ) {}

  private getRoomId(socket: Socket): number {
    return Number(socket.data.roomId);
  }

  @SubscribeMessage('game:useItem')
  async onUseItem(@ConnectedSocket() socket: Socket, @MessageBody() body: UseItemDto) {
    const roomId = this.getRoomId(socket);

    const attackerUserId = Number(socket.data.userId);
    const attackerNickname = String(socket.data.nickname ?? 'unknown');

    const targetUserId = Number(body.targetUserId);
    const targetNickname = 'unknown';
    const itemId = Number(body.itemId);

    let phaseKey: string;
    try {
      phaseKey = await this.gameSessionService.getDrawingPhaseKeyOrThrow(roomId);
    } catch {
      this.server.to(String(attackerUserId)).emit('system:notification', {
        status: 403,
        code: 'ITEM_NOT_ALLOWED_PHASE',
        errors: [{ field: 'phase', reason: ['현재 단계에서는 아이템을 사용할 수 없습니다.'] }],
      });
      return;
    }

    try {
      const result = await this.gameItemService.useItem({
        phaseKey,
        attackerUserId,
        attackerNickname,
        targetUserId,
        targetNickname,
        itemId,
      });

      this.server.to(String(attackerUserId)).emit('game:itemNotification', result.notification);
      this.server.to(String(targetUserId)).emit('game:itemNotification', result.notification);
      this.server.to(String(targetUserId)).emit('game:applyEffect', result.applyEffect);
      this.server.to(String(attackerUserId)).emit('game:inventoryUpdate', result.inventoryUpdate);
    } catch (e) {
      this.server.to(String(attackerUserId)).emit('system:notification', e);
    }
  }
}
