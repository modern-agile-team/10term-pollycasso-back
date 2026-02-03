import { FriendRelation } from './friend.response.dto';

export class FriendStatusUpdateResponseDto {
  userId: number;
  relation: FriendRelation | null;
  isOnline: boolean;

  constructor(userId: number, relation: FriendRelation | null, isOnline: boolean) {
    this.userId = userId;
    this.relation = relation;
    this.isOnline = isOnline;
  }
}
