import { Logger, UseFilters } from '@nestjs/common';
import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { ROUND_SUMMARY_EVENTS } from './constants/round-summary.constants';
import { RoundSummaryService } from './round-summary.service';
import type { GameSocket } from '../interfaces/gameSocket.interface';
import { requireRoomId, requireUserId } from '../utils/game-ws.util';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';

@UseFilters(SocketExceptionFilter)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
  namespace: '/game',
})
export class RoundSummaryGateway {
  private readonly logger = new Logger(RoundSummaryGateway.name);

  @WebSocketServer() server: Server;

  constructor(private readonly service: RoundSummaryService) {}

  @SubscribeMessage(ROUND_SUMMARY_EVENTS.ROOM_READY_TOGGLE)
  async onReadyToggle(@ConnectedSocket() client: GameSocket) {
    const userId = requireUserId(client);
    const roomId = requireRoomId(client);

    if (typeof roomId !== 'number' || typeof userId !== 'number') {
      this.logger.warn(`Missing socket.data.roomId or socket.data.userId`);
      return;
    }

    await this.service.handleReadyToggle(this.server, roomId, userId);
  }
}
