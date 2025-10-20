import { RoomMode, RoomStatus } from '@prisma/client';
import { Room } from '../../entities/rooms.entity';

export class ResRoomDto {
  readonly id: number;
  readonly name: string;
  readonly mode: RoomMode;
  readonly maxPlayers: number;
  readonly currentPlayers: number;
  readonly isPrivate: boolean;
  readonly status: RoomStatus;

  constructor(room: Room) {
    this.id = room.id!;
    this.name = room.name;
    this.mode = room.mode;
    this.maxPlayers = room.maxPlayers;
    this.currentPlayers = room.currentPlayers;
    this.isPrivate = room.isPrivate;
    this.status = room.status;
  }
}
