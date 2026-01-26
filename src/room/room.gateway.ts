import { Server } from 'socket.io';
import { RoomResponseDto } from './dtos/responses/room-response.dto';
import { DeletedRoomResponseDto } from './dtos/responses/deleted-room-response.dto';
import { Room } from './entities/room.entity';
import { IRoomsEventPublisher } from './events/room-event.publisher';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { UseFilters } from '@nestjs/common';
import { ROOM_ERROR_CODES } from './constants/room.constant';
import { wsError } from 'src/common/utils/ws-error.util';

@UseFilters(SocketExceptionFilter)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
  namespace: '/rooms',
})
export class RoomGateway implements IRoomsEventPublisher {
  @WebSocketServer()
  server: Server;

  private broadcastEvent<T>(event: string, payload: T) {
    try {
      void this.server.emit(event, payload);
    } catch (_err) {
      throw wsError(500, ROOM_ERROR_CODES.ROOM_EVENT_FAILED);
    }
  }

  roomCreated(room: Room) {
    this.broadcastEvent('room:created', new RoomResponseDto(room));
  }

  roomUpdated(room: Room) {
    this.broadcastEvent('room:updated', new RoomResponseDto(room));
  }

  roomDeleted(id: number) {
    this.broadcastEvent('room:deleted', new DeletedRoomResponseDto(id));
  }
}
