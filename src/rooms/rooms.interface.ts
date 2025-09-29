import { RoomMode, RoomStatus } from '@prisma/client';

export interface CreateRoomInput {
  name: string;
  mode: RoomMode;
  maxPlayers: number;
  isPrivate: boolean;
  hashedPassword: string | null;
}

export interface UpdateRoomInput {
  name: string;
  mode: RoomMode;
  maxPlayers: number;
  isPrivate: boolean;
  hashedPassword: string | null;
}

export interface FindRoomsQuery {
  name?: string;
  mode?: RoomMode;
  isPrivate?: boolean;
  status?: RoomStatus;
  cursor?: number;
}
