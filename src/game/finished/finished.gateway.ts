import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { RoomStatus } from '@prisma/client';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { UseFilters } from '@nestjs/common';
import { GAME_EVENTS } from '../constants/game.constant';
import { FINISHED_EVENTS } from './constants/finished.constant';

@UseFilters(SocketExceptionFilter)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
  namespace: '/game',
})
export class FinishedGateway {
  @WebSocketServer() server: Server;

  broadcastRoomState(roomId: number, status: RoomStatus) {
    this.server
      .to(this.roomRoomId(roomId))
      .emit(GAME_EVENTS.ROOM_UPDATE_GAME_STATE, { roomId, status });
  }

  unicastRewards(
    userId: number,
    payload: { matchId: number; exp: number; coin: number; placement: number },
  ) {
    this.server.to(this.userRoomId(userId)).emit(FINISHED_EVENTS.USER_REWARDS_GRANTED, payload);
  }

  private userRoomId(userId: number) {
    return `user:${userId}`;
  }
  private roomRoomId(roomId: number) {
    return `game:room:${roomId}`;
  }
}
