import { Socket } from 'socket.io';

export interface GameSocketData {
  userId: number;
  nickname: string;
  roomId: number | null;
  isHost: boolean;
}

export type GameSocket = Socket<any, any, any, GameSocketData>;
