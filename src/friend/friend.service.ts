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
import { RedisService } from 'src/redis/redis.service';
import { OutfitDto } from 'src/common/dtos/responses/outfit-response.dto';
import { OutfitVO } from 'src/common/value-objects/outfit.vo';
import { UserSearchResultDto } from './dtos/responses/user-search-result.dto';
import { UserProfile } from './types/friend.type';

function parseSearchKeyword(keyword: string): { type: FriendSearchType; value: string } {
  const trimmed = keyword.trim();
  const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (/^\d{4}$/.test(normalized)) return { type: FriendSearchType.TAG, value: normalized };
  return { type: FriendSearchType.NICKNAME, value: normalized };
}

@Injectable()
export class FriendService {
  constructor(
    @Inject('IFriendRepository') private readonly friendRepository: IFriendRepository,
    private readonly blockService: BlockService,
    private readonly userService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  private createOutfitDto(rawOutfit: unknown): OutfitDto {
    return new OutfitDto(OutfitVO.from(rawOutfit).get());
  }

  private async mapUsersToDto(users: UserProfile[]): Promise<UserSearchResultDto[]> {
    const userIds = users.map((u) => u.id);
    const keys = userIds.map((id) => `user:${id}:isOnline`);
    const onlineStatuses = await this.redisService.mget(keys);
    const onlineStatusMap = new Map<number, boolean>();
    userIds.forEach((id, i) => onlineStatusMap.set(id, onlineStatuses[i] === '1'));

    return users.map((user) => {
      return new UserSearchResultDto({
        userId: user.id,
        nickname: user.nickname,
        outfit: this.createOutfitDto(user.profile?.outfit),
        level: user.profile?.level ?? 1,
        isOnline: onlineStatusMap.get(user.id) ?? false,
      });
    });
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
      if (diff !== 0) return diff;

      if (a.relation === FriendRelation.FRIEND) {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return a.nickname.localeCompare(b.nickname, 'ko-KR');
      }
      return 0;
    });
  }

  async getFriendList(userId: number): Promise<FriendResponseDto[]> {
    const { friendships, users } = await this.friendRepository.findFriendsWithProfiles(userId);
    if (!users.length) return [];

    const blockedIds = new Set(
      (await this.blockService.getBlockedUsers(userId)).map((b) => b.blockedId),
    );
    const userMap = new Map(users.map((u) => [u.id, u]));
    const keys = users.map((u) => `user:${u.id}:isOnline`);
    const onlineStatuses = await this.redisService.mget(keys);
    const onlineStatusMap = new Map<number, boolean>();
    users.forEach((u, i) => onlineStatusMap.set(u.id, onlineStatuses[i] === '1'));

    const friends = friendships
      .map((f) => {
        const targetId = f.requesterId === userId ? f.receiverId : f.requesterId;
        const user = userMap.get(targetId);
        if (!user || !user.profile) return null;

        let relation: FriendRelation;
        if (blockedIds.has(targetId)) relation = FriendRelation.BLOCKED;
        else if (f.status === FriendStatus.ACCEPTED) relation = FriendRelation.FRIEND;
        else if (f.status === FriendStatus.PENDING)
          relation =
            f.requesterId === userId
              ? FriendRelation.REQUEST_SENT
              : FriendRelation.REQUEST_RECEIVED;
        else return null;

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

    return this.sortFriendList(friends);
  }

  async getFriendship(userId: number, targetUserId: number): Promise<Friend | null> {
    return this.friendRepository.findFriendship(userId, targetUserId);
  }

  async sendRequest(userId: number, targetUserId: number): Promise<Friend> {
    if (userId === targetUserId)
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.CANNOT_ADD_SELF,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.CANNOT_ADD_SELF]],
      });

    const targetUser = await this.userService.findOneById(targetUserId);
    if (!targetUser) throw new NotFoundException({ code: FRIEND_ERROR_CODES.USER_NOT_FOUND });

    if (await this.blockService.isBlocked(targetUserId, userId))
      throw new ForbiddenException({ code: FRIEND_ERROR_CODES.BLOCKED_BY_TARGET });

    if (await this.blockService.isBlocked(userId, targetUserId))
      throw new ForbiddenException({ code: FRIEND_ERROR_CODES.BLOCKING_TARGET });

    const existing = await this.friendRepository.findFriendship(userId, targetUserId);
    if (existing) {
      if (existing.status === FriendStatus.PENDING) {
        throw new ConflictException({ code: FRIEND_ERROR_CODES.INVALID_REQUEST_STATUS });
      }
      if (existing.status === FriendStatus.ACCEPTED) {
        throw new ConflictException({ code: FRIEND_ERROR_CODES.ALREADY_FRIENDS });
      }
    }

    return await this.friendRepository.createFriendship(userId, targetUserId);
  }

  async cancelRequest(userId: number, targetUserId: number): Promise<void> {
    const request = await this.friendRepository.findFriendship(userId, targetUserId);
    if (!request) throw new NotFoundException({ code: FRIEND_ERROR_CODES.REQUEST_NOT_FOUND });

    if (request.status !== FriendStatus.PENDING)
      throw new ConflictException({ code: FRIEND_ERROR_CODES.INVALID_REQUEST_STATUS });

    if (request.requesterId !== userId)
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.CANNOT_CANCEL_RECEIVED_REQUEST,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.CANNOT_CANCEL_RECEIVED_REQUEST]],
      });

    await this.friendRepository.deleteFriendshipById(request.id);
  }

  async respondFriendRequest(
    userId: number,
    requesterId: number,
    accept: boolean,
  ): Promise<Friend | void> {
    const request = await this.friendRepository.findFriendship(requesterId, userId);
    if (!request) throw new NotFoundException({ code: FRIEND_ERROR_CODES.REQUEST_NOT_FOUND });

    if (request.status !== FriendStatus.PENDING)
      throw new ConflictException({ code: FRIEND_ERROR_CODES.INVALID_REQUEST_STATUS });

    if (request.requesterId !== requesterId)
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.CANNOT_RESPOND_OWN_REQUEST,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.CANNOT_RESPOND_OWN_REQUEST]],
      });

    if (!accept) {
      await this.friendRepository.deleteFriendshipById(request.id);
      return;
    }

    return await this.friendRepository.updateFriendshipStatus(request.id, FriendStatus.ACCEPTED);
  }

  async removeFriend(userId: number, friendUserId: number): Promise<void> {
    const friendship = await this.friendRepository.findFriendship(userId, friendUserId);
    if (!friendship) throw new NotFoundException({ code: FRIEND_ERROR_CODES.REQUEST_NOT_FOUND });

    if (friendship.status !== FriendStatus.ACCEPTED)
      throw new ConflictException({ code: FRIEND_ERROR_CODES.NOT_FRIENDS });

    await this.friendRepository.deleteFriendshipById(friendship.id);
  }

  async searchFriends(userId: number, keyword: string): Promise<UserSearchResultDto[]> {
    const parsed = parseSearchKeyword(keyword);
    const relatedIds = await this.friendRepository.getRelatedUserIds(userId);
    const blockedIds = (await this.blockService.getBlockedUsers(userId)).map((b) => b.blockedId);
    const excludeIds = [userId, ...relatedIds, ...blockedIds];

    const users = await this.friendRepository.searchUsersByKeyword(
      parsed.type,
      parsed.value,
      excludeIds,
      FRIEND_SEARCH_RULES.SEARCH_RESULT_LIMIT,
    );
    if (!users.length) return [];

    const result = await this.mapUsersToDto(users);

    return result.sort((a, b) =>
      a.isOnline !== b.isOnline ? (a.isOnline ? -1 : 1) : b.level - a.level,
    );
  }

  async getRecommendedFriends(userId: number): Promise<UserSearchResultDto[]> {
    const relatedIds = await this.friendRepository.getRelatedUserIds(userId);
    const blockedIds = (await this.blockService.getBlockedUsers(userId)).map((b) => b.blockedId);
    const excludeIds = [...relatedIds, ...blockedIds];

    const users = await this.friendRepository.getRandomUsersForRecommendation(
      userId,
      excludeIds,
      FRIEND_SEARCH_RULES.RECOMMENDED_FRIENDS_LIMIT,
    );
    if (!users.length) return [];

    const result = await this.mapUsersToDto(users);

    return result.sort((a, b) =>
      a.isOnline !== b.isOnline ? (a.isOnline ? -1 : 1) : b.level - a.level,
    );
  }
}
