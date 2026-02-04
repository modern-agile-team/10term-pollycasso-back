import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendStatus } from '@prisma/client';
import {
  FRIEND_DOMAIN_ERRORS,
  FRIEND_ERROR_CODES,
  FRIEND_SEARCH_RULES,
  FriendSearchType,
} from './constants/friend.constant';
import type { IFriendRepository } from './interfaces/friend-repository.interface';
import { BlockService } from 'src/block/block.service';
import { UsersService } from 'src/user/user.service';
import { Friend } from './friend.entity';
import { FriendRelation, FriendResponseDto } from './dtos/responses/friend.response.dto';
import { OutfitDto } from 'src/common/dtos/responses/outfit-response.dto';
import { OutfitVO } from 'src/common/value-objects/outfit.vo';
import { FriendshipData, UserProfile } from './types/friend.type';
import { PresenceService } from 'src/presence/presence.service';
import { SearchFriendResponseDto } from './dtos/responses/search-friend.response.dto';

function parseSearchKeyword(keyword: string): { type: FriendSearchType; value: string } {
  const trimmed = keyword.trim();
  const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;

  if (/^\d{4}$/.test(normalized)) {
    return { type: FriendSearchType.TAG, value: normalized };
  }

  return { type: FriendSearchType.NICKNAME, value: normalized };
}

@Injectable()
export class FriendService {
  constructor(
    @Inject('IFriendRepository') private readonly friendRepository: IFriendRepository,
    private readonly blockService: BlockService,
    private readonly userService: UsersService,
    private readonly presenceService: PresenceService,
  ) {}

  async getFriendList(userId: number): Promise<FriendResponseDto[]> {
    const [{ friendships, users }, blockedUserProfiles] = await Promise.all([
      this.friendRepository.findFriendsWithProfiles(userId),
      this.friendRepository.findBlockedUsersWithProfiles(userId),
    ]);

    const allUsers = [...users, ...blockedUserProfiles];

    if (!allUsers.length) {
      return [];
    }

    const blockedIds = new Set(blockedUserProfiles.map((u) => u.id));
    const onlineStatusMap = await this.presenceService.getBulkOnlineStatus(
      allUsers.map((u) => u.id),
    );

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const friends = this.mapFriendships(friendships, userId, userMap, blockedIds, onlineStatusMap);

    const friendUserIds = new Set(friends.map((f) => f.userId));
    blockedUserProfiles.forEach((blockedUser) => {
      if (!friendUserIds.has(blockedUser.id)) {
        friends.push({
          userId: blockedUser.id,
          nickname: blockedUser.nickname,
          outfit: this.createOutfitDto(blockedUser.profile?.outfit),
          level: blockedUser.profile?.level ?? 1,
          isOnline: onlineStatusMap.get(blockedUser.id) ?? false,
          relation: FriendRelation.BLOCKED,
        });
      }
    });

    return this.sortFriendList(friends);
  }

  async getFriendship(userId: number, targetUserId: number): Promise<Friend | null> {
    return this.friendRepository.findFriendship(userId, targetUserId);
  }

  async sendRequest(userId: number, targetUserId: number): Promise<Friend> {
    this.validateSelfRequest(userId, targetUserId);

    const targetUser = await this.userService.findOneById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.USER_NOT_FOUND });
    }

    await this.validateBlockStatus(userId, targetUserId);
    await this.validateExistingFriendship(userId, targetUserId);

    return this.friendRepository.createFriendship(userId, targetUserId);
  }

  async cancelRequest(userId: number, targetUserId: number): Promise<void> {
    const request = await this.getFriendshipOrThrow(userId, targetUserId);
    if (request.status !== FriendStatus.PENDING) {
      throw new ConflictException({ code: FRIEND_ERROR_CODES.REQUEST_ALREADY_PROCESSED });
    }

    this.validateRequester(
      request.requesterId,
      userId,
      FRIEND_ERROR_CODES.CANNOT_CANCEL_RECEIVED_REQUEST,
    );

    await this.friendRepository.deleteFriendshipById(request.id);
  }

  async respondFriendRequest(
    userId: number,
    requesterId: number,
    accept: boolean,
  ): Promise<Friend | void> {
    const request = await this.getFriendshipOrThrow(requesterId, userId);
    if (request.status !== FriendStatus.PENDING) {
      throw new ConflictException({ code: FRIEND_ERROR_CODES.REQUEST_ALREADY_PROCESSED });
    }

    this.validateRequester(
      request.requesterId,
      requesterId,
      FRIEND_ERROR_CODES.CANNOT_RESPOND_OWN_REQUEST,
    );

    if (!accept) {
      await this.friendRepository.deleteFriendshipById(request.id);
      return;
    }

    const result = await this.friendRepository.updateFriendshipStatus(
      request.id,
      FriendStatus.ACCEPTED,
    );
    return result;
  }

  async removeFriend(userId: number, friendUserId: number): Promise<void> {
    const friendship = await this.getFriendshipOrThrow(userId, friendUserId);
    if (friendship.status !== FriendStatus.ACCEPTED) {
      throw new ConflictException({ code: FRIEND_ERROR_CODES.NOT_A_FRIEND });
    }

    await this.friendRepository.deleteFriendshipById(friendship.id);
  }

  async searchFriends(userId: number, keyword: string): Promise<SearchFriendResponseDto[]> {
    const parsed = parseSearchKeyword(keyword);
    const excludeIds = await this.getExcludedUserIds(userId);

    const { data: users } = await this.friendRepository.searchUsersByKeyword(
      parsed.type,
      parsed.value,
      excludeIds,
      FRIEND_SEARCH_RULES.SEARCH_RESULT_LIMIT,
    );

    if (!users.length) {
      return [];
    }

    const results = await this.mapUsersToSearchDto(users);
    return this.sortByOnlineAndLevel(results);
  }

  async searchFriendsWithRelation(userId: number, keyword: string): Promise<FriendResponseDto[]> {
    const parsed = parseSearchKeyword(keyword);
    const { friendships, users } = await this.friendRepository.findFriendsWithProfiles(userId);

    if (!users.length) {
      return [];
    }

    const relatedUserIds = friendships.map((f) =>
      f.requesterId === userId ? f.receiverId : f.requesterId,
    );

    const relatedUsers = users.filter((u) => relatedUserIds.includes(u.id));

    if (!relatedUsers.length) {
      return [];
    }

    const filtered = this.filterUsersByKeyword(relatedUsers, parsed);

    if (!filtered.length) {
      return [];
    }

    const results = await this.mapUsersWithRelation(filtered, friendships, userId);
    return this.sortByOnlineAndLevel(results);
  }

  async getRecommendedFriends(userId: number): Promise<SearchFriendResponseDto[]> {
    const excludeIds = await this.getExcludedUserIds(userId, false);

    const { data: users } = await this.friendRepository.getRandomUsersForRecommendation(
      userId,
      excludeIds,
      FRIEND_SEARCH_RULES.RECOMMENDED_FRIENDS_LIMIT,
    );

    if (!users.length) {
      return [];
    }

    const results = await this.mapUsersToSearchDto(users);
    return this.sortByOnlineAndLevel(results);
  }

  async removeFriendshipIfExists(userId: number, targetUserId: number): Promise<void> {
    await this.friendRepository.deleteFriendshipIfExists(userId, targetUserId);
  }

  private createOutfitDto(rawOutfit: unknown): OutfitDto {
    return new OutfitDto(OutfitVO.from(rawOutfit).get());
  }

  private async mapUsersWithRelation(
    users: UserProfile[],
    friendships: FriendshipData[],
    userId: number,
  ): Promise<FriendResponseDto[]> {
    const onlineStatusMap = await this.presenceService.getBulkOnlineStatus(users.map((u) => u.id));

    const friendshipMap = new Map<number, FriendshipData>();
    friendships.forEach((f) => {
      const targetId = f.requesterId === userId ? f.receiverId : f.requesterId;
      friendshipMap.set(targetId, f);
    });

    return users.map((user) => {
      const friendship = friendshipMap.get(user.id);
      const relation = this.determineFriendRelation(friendship!, userId, user.id, new Set());

      return new FriendResponseDto({
        userId: user.id,
        nickname: user.nickname,
        outfit: this.createOutfitDto(user.profile?.outfit),
        level: user.profile?.level ?? 1,
        isOnline: onlineStatusMap.get(user.id) ?? false,
        relation: relation!,
      });
    });
  }

  private async mapUsersToSearchDto(users: UserProfile[]): Promise<SearchFriendResponseDto[]> {
    const onlineStatusMap = await this.presenceService.getBulkOnlineStatus(users.map((u) => u.id));

    return users.map((user) => {
      return new SearchFriendResponseDto({
        userId: user.id,
        nickname: user.nickname,
        outfit: this.createOutfitDto(user.profile?.outfit),
        level: user.profile?.level ?? 1,
        isOnline: onlineStatusMap.get(user.id) ?? false,
      });
    });
  }

  private mapFriendships(
    friendships: FriendshipData[],
    userId: number,
    userMap: Map<number, UserProfile>,
    blockedIds: Set<number>,
    onlineStatusMap: Map<number, boolean>,
  ): FriendResponseDto[] {
    return friendships
      .map((f) => {
        const targetId = f.requesterId === userId ? f.receiverId : f.requesterId;
        const user = userMap.get(targetId);

        if (!user || !user.profile) {
          return null;
        }

        const relation = this.determineFriendRelation(f, userId, targetId, blockedIds);

        if (!relation) {
          return null;
        }

        return {
          userId: user.id,
          nickname: user.nickname,
          outfit: this.createOutfitDto(user.profile.outfit),
          level: user.profile.level,
          isOnline: onlineStatusMap.get(user.id) ?? false,
          relation,
        };
      })
      .filter((v): v is FriendResponseDto => v !== null);
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

  private sortFriendList(friends: FriendResponseDto[]): FriendResponseDto[] {
    const order: Record<FriendRelation, number> = {
      REQUEST_RECEIVED: 0,
      REQUEST_SENT: 1,
      FRIEND: 2,
      BLOCKED: 3,
    };

    return friends.sort((a, b) => {
      const diff = order[a.relation] - order[b.relation];

      if (diff !== 0) {
        return diff;
      }

      if (a.relation === FriendRelation.FRIEND) {
        if (a.isOnline !== b.isOnline) {
          return a.isOnline ? -1 : 1;
        }
        return a.nickname.localeCompare(b.nickname, 'ko-KR');
      }

      return 0;
    });
  }

  private sortByOnlineAndLevel<T extends { isOnline: boolean; level?: number }>(results: T[]): T[] {
    return results.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      return (b.level ?? 0) - (a.level ?? 0);
    });
  }

  private filterUsersByKeyword(
    users: UserProfile[],
    parsed: { type: FriendSearchType; value: string },
  ): UserProfile[] {
    if (parsed.type === FriendSearchType.TAG) {
      return users.filter((f) => f.tag === parsed.value);
    }

    return users.filter((f) => f.nickname.toLowerCase().includes(parsed.value.toLowerCase()));
  }

  private async getExcludedUserIds(userId: number, includeUserId = true): Promise<number[]> {
    const [relatedIds, blockedUsers] = await Promise.all([
      this.friendRepository.getRelatedUserIds(userId),
      this.blockService.getBlockedUsers(userId),
    ]);

    const blockedIds = blockedUsers.map((b) => b.blockedId);
    const excludeIds = includeUserId
      ? [userId, ...relatedIds, ...blockedIds]
      : [...relatedIds, ...blockedIds];

    return excludeIds;
  }

  private validateSelfRequest(userId: number, targetUserId: number): void {
    if (userId === targetUserId) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.CANNOT_REQUEST_SELF,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.CANNOT_REQUEST_SELF]],
      });
    }
  }

  private async validateBlockStatus(userId: number, targetUserId: number): Promise<void> {
    const [isBlockedByTarget, isBlockingTarget] = await Promise.all([
      this.blockService.isBlocked(targetUserId, userId),
      this.blockService.isBlocked(userId, targetUserId),
    ]);

    if (isBlockedByTarget) {
      throw new ForbiddenException({ code: FRIEND_ERROR_CODES.BLOCKED_BY_TARGET });
    }

    if (isBlockingTarget) {
      throw new ForbiddenException({ code: FRIEND_ERROR_CODES.BLOCKING_TARGET });
    }
  }

  private async validateExistingFriendship(userId: number, targetUserId: number): Promise<void> {
    const existing = await this.friendRepository.findFriendship(userId, targetUserId);

    if (!existing) {
      return;
    }

    if (existing.status === FriendStatus.PENDING) {
      throw new ConflictException({ code: FRIEND_ERROR_CODES.ALREADY_SENT_REQUEST });
    }

    if (existing.status === FriendStatus.ACCEPTED) {
      throw new ConflictException({ code: FRIEND_ERROR_CODES.ALREADY_FRIEND });
    }
  }

  private async getFriendshipOrThrow(userId: number, targetUserId: number): Promise<Friend> {
    const friendship = await this.friendRepository.findFriendship(userId, targetUserId);

    if (!friendship) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.REQUEST_NOT_FOUND });
    }

    return friendship;
  }

  private validateRequester(
    actualRequesterId: number,
    expectedRequesterId: number,
    errorCode: string,
  ): void {
    if (actualRequesterId !== expectedRequesterId) {
      throw new BadRequestException({ code: errorCode });
    }
  }
}
