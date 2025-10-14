import { QueryRoomDto } from '../dtos/requests/query-room.dto';
import { Room } from '../entities/rooms.entity';

export interface IRoomsRepository {
  create(room: Room): Promise<Room>;
  findOne(id: number): Promise<Room | null>;
  findAll(query: QueryRoomDto, take: number): Promise<Room[]>;
  update(id: number, room: Room): Promise<Room>;
  remove(id: number): Promise<void>;
}
