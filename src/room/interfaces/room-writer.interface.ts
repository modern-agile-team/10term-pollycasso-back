import { RoomMode } from '@prisma/client';
import { Room } from '../entities/room.entity';

export interface IRoomWriter {
  updateRoomWhileWaiting(
    roomId: number,
    payload: {
      name?: string;
      mode?: RoomMode;
      maxPlayers?: number;
      isPrivate?: boolean;
      password?: string;
    },
  ): Promise<Room>;

  publishRoomUpdated(roomId: number): Promise<void>;

  removeRoom(roomId: number): Promise<void>;
}
