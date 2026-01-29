export enum FriendRelation {
  FRIEND = 'FRIEND',
  REQUEST_RECEIVED = 'REQUEST_RECEIVED',
  REQUEST_SENT = 'REQUEST_SENT',
  BLOCKED = 'BLOCKED',
}

export class FriendResponseDto {
  userId: number;
  nickname: string;
  outfit: string;
  level: number;
  isOnline: boolean;
  relation: FriendRelation;
}
