import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ResRoomDto } from './dtos/responses/room-response.dto';
import { ResDeletedRoomDto } from './dtos/responses/deleted-room-response.dto';
import { Room } from './entities/rooms.entity';
import { IRoomsEventPublisher } from './events/rooms-event.publisher';
import { AsyncApiPub } from 'nestjs-asyncapi';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'https://www.pollycasso.com'],
    credentials: true,
  },
  namespace: '/rooms',
})
export class RoomsGateway implements IRoomsEventPublisher {
  private readonly logger = new Logger(RoomsGateway.name);

  @WebSocketServer()
  server: Server;

  @AsyncApiPub({
    channel: 'room:created',
    message: { payload: ResRoomDto },
  })
  roomCreated(room: Room) {
    try {
      const payload = new ResRoomDto(room);
      void this.server.emit('room:created', payload);
    } catch (err) {
      this.logger.error(`Failed to emit room created: ${room.id}`, err);
    }
  }

  @AsyncApiPub({
    channel: 'room:updated',
    message: { payload: ResRoomDto },
  })
  roomUpdated(room: Room) {
    try {
      const payload = new ResRoomDto(room);
      void this.server.emit('room:updated', payload);
    } catch (err) {
      this.logger.error(`Failed to emit room updated: ${room.id}`, err);
    }
  }

  @AsyncApiPub({
    channel: 'room:deleted',
    message: { payload: ResDeletedRoomDto },
  })
  roomDeleted(id: number) {
    try {
      const payload = new ResDeletedRoomDto(id);
      void this.server.emit('room:deleted', payload);
    } catch (err) {
      this.logger.error(`Failed to emit room deleted: ${id}`, err);
    }
  }
}
