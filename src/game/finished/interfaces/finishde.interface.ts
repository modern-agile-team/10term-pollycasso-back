import { RoomStatus } from '@prisma/client';

export interface RewardsGrantedEvent {
  userId: number;
  matchId: number;
  exp: number;
  coin: number;
}

export interface RoomStateChangedEvent {
  roomId: number;
  status: RoomStatus;
}
