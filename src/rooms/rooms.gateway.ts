import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ResRoomDto } from './dtos/responses/room-response.dto';
import { Room } from './entities/rooms.entity';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
  },
  namespace: '/rooms',
})
export class RoomsGateway {
  @WebSocketServer()
  server: Server;

  roomCreated(room: Room) {
    this.server.emit('room:created', new ResRoomDto(room));
  }

  roomUpdated(room: Room) {
    this.server.emit('room:updated', new ResRoomDto(room));
  }

  roomDeleted(id: number) {
    this.server.emit('room:deleted', { id });
  }
}
