import { Server } from 'socket.io';
import { ResRoomDto } from './dtos/responses/room-response.dto';
import { ResDeletedRoomDto } from './dtos/responses/deleted-room-response.dto';
import { Room } from './entities/room.entity';
import { IRoomsEventPublisher } from './events/room-event.publisher';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { Inject, UseFilters } from '@nestjs/common';
import { ROOM_ERROR_CODES } from './constants/room.constant';
import { wsError } from 'src/common/utils/ws-error.util';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

@UseFilters(SocketExceptionFilter)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    credentials: true,
  },
  namespace: '/rooms',
})
export class RoomsGateway implements IRoomsEventPublisher {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  private broadcastEvent<T>(event: string, payload: T) {
    try {
      void this.server.emit(event, payload);

      const id = (payload as ResRoomDto | ResDeletedRoomDto).id;
      this.logger.debug(`Event emitted successfully: ${event} - id: ${id}`);
    } catch (err) {
      this.logger.error(`Failed to emit event: ${event}`, err as Error);

      throw wsError(400, ROOM_ERROR_CODES.ROOM_EVENT_FAILED);
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
