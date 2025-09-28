import { RoomMode } from '@prisma/client';

export interface RoomInterface {
  name: string;
  mode: RoomMode;
  maxPlayers: number;
  isPrivate?: boolean;
  hashedPassword?: string | null;
}

export interface RoomQueryInterface {
  name?: string;
  mode?: string;
  status?: string;
  cursor?: number;
}
