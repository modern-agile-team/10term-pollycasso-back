import { QueryRoomDto } from '../dtos/requests/query-room.dto';
import { Room } from '../entities/rooms.entity';

export interface IRoomsRepository {
  createRoom(room: Room): Promise<Room>;
  findOneRoom(id: number): Promise<Room | null>;
  findAllRooms(query: QueryRoomDto, take: number): Promise<Room[]>;
  updateRoom(id: number, room: Room): Promise<Room>;
  deleteRoom(id: number): Promise<void>;
}
