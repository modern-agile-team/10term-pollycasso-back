import { Room } from '../entities/room.entity';

export interface IRoomReader {
  getOneRoom(roomId: number): Promise<Room>;
}
