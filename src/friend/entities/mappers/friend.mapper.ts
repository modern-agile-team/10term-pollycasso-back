import { Injectable } from '@nestjs/common';
import { FriendStatus } from '@prisma/client';
import { OutfitDto } from 'src/common/dtos/responses/outfit-response.dto';
import { OutfitVO } from 'src/common/value-objects/outfit.vo';
import { FriendRelation, FriendResponseDto } from 'src/friend/dtos/responses/friend.response.dto';
import { SearchFriendResponseDto } from 'src/friend/dtos/responses/search-friend.response.dto';
import { FriendshipData, UserProfile } from 'src/friend/types/friend.type';

@Injectable()
export class FriendMapper {
  createFriendResponseDto(
    user: UserProfile,
    relation: FriendRelation,
    onlineStatusMap: Map<number, boolean>,
  ): FriendResponseDto {
    return new FriendResponseDto({
      userId: user.id,
      nickname: user.nickname,
      tag: user.tag,
      outfit: this.createOutfitDto(user.profile?.outfit),
      level: user.profile?.level ?? 1,
      isOnline: onlineStatusMap.get(user.id) ?? false,
      relation: relation,
    });
  }

  createSearchFriendResponseDto(
    user: UserProfile,
    onlineStatusMap: Map<number, boolean>,
  ): SearchFriendResponseDto {
    return new SearchFriendResponseDto({
      userId: user.id,
      nickname: user.nickname,
      tag: user.tag,
      outfit: this.createOutfitDto(user.profile?.outfit),
      level: user.profile?.level ?? 1,
      isOnline: onlineStatusMap.get(user.id) ?? false,
    });
  }

  mapFriendships(
    friendships: FriendshipData[],
    userId: number,
    userMap: Map<number, UserProfile>,
    blockedIds: Set<number>,
    onlineStatusMap: Map<number, boolean>,
  ): FriendResponseDto[] {
    return friendships
      .map((friendship) => {
        const targetId =
          friendship.requesterId === userId ? friendship.receiverId : friendship.requesterId;

        const user = userMap.get(targetId);

        if (!user || !user.profile) {
          return null;
        }

        const relation = this.determineFriendRelation(friendship, userId, targetId, blockedIds);

        if (!relation) {
          return null;
        }

        return this.createFriendResponseDto(user, relation, onlineStatusMap);
      })
      .filter((dto): dto is FriendResponseDto => dto !== null);
  }

  mapUsersToSearchDto(
    users: UserProfile[],
    onlineStatusMap: Map<number, boolean>,
  ): SearchFriendResponseDto[] {
    return users.map((user) => this.createSearchFriendResponseDto(user, onlineStatusMap));
  }

  mapUsersWithRelation(
    users: UserProfile[],
    friendships: FriendshipData[],
    userId: number,
    blockedIds: Set<number>,
    onlineStatusMap: Map<number, boolean>,
  ): FriendResponseDto[] {
    const friendshipMap = new Map<number, FriendshipData>();
    friendships.forEach((friendship) => {
      const targetId =
        friendship.requesterId === userId ? friendship.receiverId : friendship.requesterId;
      friendshipMap.set(targetId, friendship);
    });

    return users
      .map((user) => {
        if (!user.profile) {
          return null;
        }

        const friendship = friendshipMap.get(user.id);
        return this.buildFriendResponseDto(user, friendship, userId, blockedIds, onlineStatusMap);
      })
      .filter((dto): dto is FriendResponseDto => dto !== null);
  }

  private determineFriendRelation(
    friendship: FriendshipData,
    userId: number,
    targetId: number,
    blockedIds: Set<number>,
  ): FriendRelation | null {
    if (blockedIds.has(targetId)) {
      return FriendRelation.BLOCKED;
    }

    if (friendship.status === FriendStatus.ACCEPTED) {
      return FriendRelation.FRIEND;
    }

    if (friendship.status === FriendStatus.PENDING) {
      return friendship.requesterId === userId
        ? FriendRelation.REQUEST_SENT
        : FriendRelation.REQUEST_RECEIVED;
    }

    return null;
  }

  private buildFriendResponseDto(
    user: UserProfile,
    friendship: FriendshipData | undefined,
    userId: number,
    blockedIds: Set<number>,
    onlineStatusMap: Map<number, boolean>,
  ): FriendResponseDto | null {
    if (!friendship) {
      return this.buildBlockedUserDto(user, blockedIds, onlineStatusMap);
    }

    const relation = this.determineFriendRelation(friendship, userId, user.id, blockedIds);

    if (!relation) {
      return null;
    }

    return this.createFriendResponseDto(user, relation, onlineStatusMap);
  }

  private buildBlockedUserDto(
    user: UserProfile,
    blockedIds: Set<number>,
    onlineStatusMap: Map<number, boolean>,
  ): FriendResponseDto | null {
    if (!blockedIds.has(user.id)) {
      return null;
    }

    return this.createFriendResponseDto(user, FriendRelation.BLOCKED, onlineStatusMap);
  }

  private createOutfitDto(rawOutfit: unknown): OutfitDto {
    return new OutfitDto(OutfitVO.from(rawOutfit).get());
  }
}
