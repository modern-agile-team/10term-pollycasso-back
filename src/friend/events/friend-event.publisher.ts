import { FriendRelation } from '../dtos/responses/friend.response.dto';

export interface IFriendEventPublisher {
  friendStatusUpdated(
    userId: number,
    friendIds: number[],
    relation: FriendRelation | null,
    isOnline: boolean,
  ): void;
}
