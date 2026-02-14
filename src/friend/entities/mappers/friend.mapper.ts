import { Injectable } from '@nestjs/common';
import { FriendStatus } from '@prisma/client';
import { FriendRelation, FriendResponseDto } from 'src/friend/dtos/responses/friend.response.dto';
import { SearchFriendResponseDto } from 'src/friend/dtos/responses/search-friend.response.dto';
import { FriendshipData, UserProfile } from 'src/friend/types/friend.type';
import { OutfitConverterService } from 'src/outfit/outfit-converter.service';
import { OutfitPathsResponseDto } from 'src/outfit/dtos/responses/outfit-paths-response.dto';
import { OutfitVO } from 'src/outfit/outfit.vo';
import { OutfitAssetPaths } from 'src/outfit/outfit.type';
import { DEFAULT_OUTFIT_PATHS } from 'src/outfit/constants/outfit.constant';

@Injectable()
export class FriendMapper {
  constructor(private readonly outfitConverter: OutfitConverterService) {}

  async createFriendResponseDto(
    user: UserProfile,
    relation: FriendRelation,
    onlineStatusMap: Map<number, boolean>,
  ): Promise<FriendResponseDto> {
    const outfitIds = OutfitVO.from(user.profile?.outfit).get();
    const outfitPaths = await this.outfitConverter.convertIdsToPath(outfitIds);

    return this.buildFriendDto(user, relation, onlineStatusMap, outfitPaths);
  }

  async createSearchFriendResponseDto(
    user: UserProfile,
    onlineStatusMap: Map<number, boolean>,
  ): Promise<SearchFriendResponseDto> {
    const outfitIds = OutfitVO.from(user.profile?.outfit).get();
    const outfitPaths = await this.outfitConverter.convertIdsToPath(outfitIds);

    return this.buildSearchDto(user, onlineStatusMap, outfitPaths);
  }

  async mapFriendships(
    friendships: FriendshipData[],
    userId: number,
    userMap: Map<number, UserProfile>,
    blockedIds: Set<number>,
    onlineStatusMap: Map<number, boolean>,
  ): Promise<FriendResponseDto[]> {
    const validUsers: UserProfile[] = [];
    const friendshipMap = new Map<number, FriendshipData>();

    for (const friendship of friendships) {
      const targetId =
        friendship.requesterId === userId ? friendship.receiverId : friendship.requesterId;

      const user = userMap.get(targetId);

      if (user?.profile) {
        validUsers.push(user);
        friendshipMap.set(user.id, friendship);
      }
    }

    if (validUsers.length === 0) return [];

    const outfitPaths = await this.batchConvertOutfits(validUsers);

    return validUsers
      .map((user, index) => {
        const friendship = friendshipMap.get(user.id);
        if (!friendship) return null;

        const relation = this.determineFriendRelation(friendship, userId, user.id, blockedIds);

        if (!relation) return null;

        return this.buildFriendDto(
          user,
          relation,
          onlineStatusMap,
          outfitPaths[index] ?? DEFAULT_OUTFIT_PATHS,
        );
      })
      .filter((dto): dto is FriendResponseDto => dto !== null);
  }

  async mapUsersToSearchDto(
    users: UserProfile[],
    onlineStatusMap: Map<number, boolean>,
  ): Promise<SearchFriendResponseDto[]> {
    if (users.length === 0) return [];

    const validUsers = users.filter((u) => u.profile);
    if (validUsers.length === 0) return [];

    const outfitPaths = await this.batchConvertOutfits(validUsers);

    return validUsers.map((user, index) =>
      this.buildSearchDto(user, onlineStatusMap, outfitPaths[index] ?? DEFAULT_OUTFIT_PATHS),
    );
  }

  async mapUsersWithRelation(
    users: UserProfile[],
    friendships: FriendshipData[],
    userId: number,
    blockedIds: Set<number>,
    onlineStatusMap: Map<number, boolean>,
  ): Promise<FriendResponseDto[]> {
    const friendshipMap = new Map<number, FriendshipData>();

    for (const friendship of friendships) {
      const targetId =
        friendship.requesterId === userId ? friendship.receiverId : friendship.requesterId;

      friendshipMap.set(targetId, friendship);
    }

    const validUsers = users.filter((u) => u.profile);
    if (validUsers.length === 0) return [];

    const outfitPaths = await this.batchConvertOutfits(validUsers);

    return validUsers
      .map((user, index) => {
        const friendship = friendshipMap.get(user.id);

        return this.buildFriendResponseDtoWithPaths(
          user,
          friendship,
          userId,
          blockedIds,
          onlineStatusMap,
          outfitPaths[index] ?? DEFAULT_OUTFIT_PATHS,
        );
      })
      .filter((dto): dto is FriendResponseDto => dto !== null);
  }

  private async batchConvertOutfits(users: UserProfile[]): Promise<OutfitAssetPaths[]> {
    const outfitIds = users.map((user) => OutfitVO.from(user.profile?.outfit).get());

    return this.outfitConverter.convertMultipleIdsToPath(outfitIds);
  }

  private buildFriendDto(
    user: UserProfile,
    relation: FriendRelation,
    onlineStatusMap: Map<number, boolean>,
    outfitPaths: OutfitAssetPaths,
  ): FriendResponseDto {
    return new FriendResponseDto({
      userId: user.id,
      nickname: user.nickname,
      tag: user.tag,
      outfit: new OutfitPathsResponseDto(outfitPaths),
      level: user.profile?.level ?? 1,
      isOnline: onlineStatusMap.get(user.id) ?? false,
      relation,
    });
  }

  private buildSearchDto(
    user: UserProfile,
    onlineStatusMap: Map<number, boolean>,
    outfitPaths: OutfitAssetPaths,
  ): SearchFriendResponseDto {
    return new SearchFriendResponseDto({
      userId: user.id,
      nickname: user.nickname,
      tag: user.tag,
      outfit: new OutfitPathsResponseDto(outfitPaths),
      level: user.profile?.level ?? 1,
      isOnline: onlineStatusMap.get(user.id) ?? false,
    });
  }

  private buildFriendResponseDtoWithPaths(
    user: UserProfile,
    friendship: FriendshipData | undefined,
    userId: number,
    blockedIds: Set<number>,
    onlineStatusMap: Map<number, boolean>,
    outfitPaths: OutfitAssetPaths,
  ): FriendResponseDto | null {
    if (!friendship) {
      if (!blockedIds.has(user.id)) return null;

      return this.buildFriendDto(user, FriendRelation.BLOCKED, onlineStatusMap, outfitPaths);
    }

    const relation = this.determineFriendRelation(friendship, userId, user.id, blockedIds);

    if (!relation) return null;

    return this.buildFriendDto(user, relation, onlineStatusMap, outfitPaths);
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
}
