import { Friend } from '../friend.entity';
import { FriendStatus } from '@prisma/client';
import { FriendshipData, UserProfile } from '../types/friend.type';

export interface IFriendRepository {
  findFriendship(userId: number, targetUserId: number): Promise<Friend | null>;
  createFriendship(userId: number, targetUserId: number): Promise<Friend>;
  updateFriendshipStatus(id: number, status: FriendStatus): Promise<Friend>;
  deleteFriendshipById(id: number): Promise<void>;
  findFriendsWithProfiles(userId: number): Promise<{
    friendships: FriendshipData[];
    users: UserProfile[];
  }>;
  getRelatedUserIds(userId: number): Promise<number[]>;
  searchUsersByKeyword(
    searchType: 'tag' | 'nickname',
    value: string,
    excludeIds: number[],
    limit: number,
  ): Promise<UserProfile[]>;
  getRandomUsersForRecommendation(
    userId: number,
    excludeIds: number[],
    limit: number,
  ): Promise<UserProfile[]>;
}
