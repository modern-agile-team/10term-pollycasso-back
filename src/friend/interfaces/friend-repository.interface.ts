import { Friend } from '../entities/friend.entity';
import { FriendStatus } from '@prisma/client';
import { FriendshipData, UserProfile } from '../types/friend.type';
import { FriendSearchType } from '../constants/friend.constant';

export interface IFriendRepository {
  findFriendship(userId: number, targetUserId: number): Promise<Friend | null>;
  createFriendship(userId: number, targetUserId: number): Promise<Friend>;
  updateFriendshipStatus(id: number, status: FriendStatus): Promise<Friend>;
  deleteFriendshipById(id: number): Promise<void>;
  findFriendsWithProfiles(userId: number): Promise<{
    friendships: FriendshipData[];
    users: UserProfile[];
  }>;
  findBlockedUsersWithProfiles(userId: number): Promise<UserProfile[]>;
  getRelatedUserIds(userId: number): Promise<number[]>;
  deleteFriendshipIfExists(userId: number, targetUserId: number): Promise<void>;
  searchUsersByKeyword(
    searchType: FriendSearchType,
    value: string,
    excludeIds: number[],
    limit: number,
    cursor?: number,
  ): Promise<{ data: UserProfile[]; hasNextPage: boolean; nextCursor: number | null }>;
  getRandomUsersForRecommendation(
    userId: number,
    excludeIds: number[],
    limit: number,
    cursor?: number,
  ): Promise<{ data: UserProfile[]; hasNextPage: boolean; nextCursor: number | null }>;
}
