import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { UseFilters } from '@nestjs/common';
import { FINISHED_EVENTS } from './constants/finished.constant';
import { MatchRewardResponseDto } from './dtos/responses/match-reward.dto';

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

  unicastRewards(userId: number, payload: MatchRewardResponseDto) {
    this.server.to(this.userRoomId(userId)).emit(FINISHED_EVENTS.USER_REWARDS_GRANTED, payload);
  }

  private userRoomId(userId: number) {
    return `user:${userId}`;
  }
  private roomRoomId(roomId: number) {
    return `game:room:${roomId}`;
  }
}
