import { Server } from 'socket.io';
import { ResRoomDto } from './dtos/responses/room-response.dto';
import { ResDeletedRoomDto } from './dtos/responses/deleted-room-response.dto';
import { Room } from './entities/rooms.entity';
import { IRoomsEventPublisher } from './events/rooms-event.publisher';
import { WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { Logger, UseFilters } from '@nestjs/common';

@UseFilters(SocketExceptionFilter)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  },
  namespace: '/rooms',
})
export class RoomsGateway implements IRoomsEventPublisher {
  private readonly logger = new Logger(RoomsGateway.name);

  @WebSocketServer()
  server: Server;

  private broadcastEvent<T>(event: string, payload: T) {
    try {
      void this.server.emit(event, payload);

      const id = (payload as ResRoomDto | ResDeletedRoomDto).id;
      this.logger.debug(`Event emitted successfully: ${event} - id: ${id}`);
    } catch (err) {
      this.logger.error(`Failed to emit event: ${event}`, err as Error);

      throw new WsException({
        status: 500,
        code: 'ROOM_EVENT_FAILED',
        errors: [],
      });
    }
  }

  roomCreated(room: Room) {
    this.broadcastEvent('room:created', new ResRoomDto(room));
  }

  roomUpdated(room: Room) {
    this.broadcastEvent('room:updated', new ResRoomDto(room));
  }

  roomDeleted(id: number) {
    this.broadcastEvent('room:deleted', new ResDeletedRoomDto(id));
  }
}
