import { DefaultEventsMap, Socket } from 'socket.io';

export interface GameSocketData {
  userId: number;
  nickname: string;
  roomId: number | null;
  isHost: boolean;
}

export type GameSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  GameSocketData
>;
