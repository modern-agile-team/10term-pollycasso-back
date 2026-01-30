import { Outfit } from 'src/common/types/outfit.type';

export enum FriendRelation {
  FRIEND = 'FRIEND',
  REQUEST_RECEIVED = 'REQUEST_RECEIVED',
  REQUEST_SENT = 'REQUEST_SENT',
  BLOCKED = 'BLOCKED',
}

export class FriendResponseDto {
  userId: number;
  nickname: string;
  outfit: Outfit;
  level: number;
  isOnline: boolean;
  relation: FriendRelation;
}
