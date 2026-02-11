import { wsError } from 'src/common/utils/ws-error.util';
import { GAME_ERRORS } from '../constants/game.constant';
import type { GameSocket } from '../interfaces/gameSocket.interface';

export function requireUserId(socket: GameSocket): number {
  const userId = socket.data?.userId;
  if (userId == null || Number.isNaN(userId)) {
    throw wsError(401, GAME_ERRORS.GAME_UNAUTHORIZED);
  }
  return userId;
}

export function requireRoomId(socket: GameSocket): number {
  const roomId = socket.data?.roomId;
  if (roomId == null || Number.isNaN(roomId)) {
    throw wsError(400, GAME_ERRORS.GAME_CONTEXT_INVALID);
  }
  return roomId;
}
