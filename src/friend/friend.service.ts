import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FriendStatus } from '@prisma/client';
import { FRIEND_DOMAIN_ERRORS, FRIEND_ERROR_CODES } from './constants/friend.constant';
import type { IFriendRepository } from './interfaces/friend-repository.interface';
import { BlockService } from 'src/block/block.service';
import { UsersService } from 'src/user/user.service';
import { Friend } from './friend.entity';
import { FriendRelation, FriendResponseDto } from './dtos/responses/friend.response.dto';
import { RedisService } from 'src/redis/redis.service';
import { OutfitDto } from 'src/common/dtos/responses/outfit-response.dto';
import { OutfitVO } from 'src/common/value-objects/outfit.vo';

@Injectable()
export class FriendService {
  constructor(
    @Inject('IFriendRepository')
    private readonly friendRepository: IFriendRepository,
    private readonly blockService: BlockService,
    private readonly userService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  async getFriendList(userId: number): Promise<FriendResponseDto[]> {
    const { friendships, users } = await this.friendRepository.findFriendsWithProfiles(userId);

    if (!users.length) return [];

    const blockedUsers = await this.blockService.getBlockedUsers(userId);
    const blockedIds = new Set(blockedUsers.map((b) => b.blockedId));

    const userMap = new Map(users.map((u) => [u.id, u]));

    const keys = users.map((u) => `user:${u.id}:isOnline`);
    const onlineStatuses = await this.redisService.mget(keys);
    const onlineStatusMap = new Map<number, boolean>();
    users.forEach((u, i) => onlineStatusMap.set(u.id, onlineStatuses[i] === '1'));

    const result = friendships
      .map((friendship) => {
        const targetId =
          friendship.requesterId === userId ? friendship.receiverId : friendship.requesterId;

        const user = userMap.get(targetId);
        if (!user || !user.profile) return null;

        let relation: FriendRelation;

        if (blockedIds.has(targetId)) {
          relation = FriendRelation.BLOCKED;
        } else if (friendship.status === FriendStatus.ACCEPTED) {
          relation = FriendRelation.FRIEND;
        } else if (friendship.status === FriendStatus.PENDING) {
          relation =
            friendship.requesterId === userId
              ? FriendRelation.REQUEST_SENT
              : FriendRelation.REQUEST_RECEIVED;
        } else {
          return null;
        }

        const outfit = OutfitVO.from(user.profile.outfit);

        return {
          userId: user.id,
          nickname: user.nickname,
          outfit: new OutfitDto(outfit.get()),
          level: user.profile.level,
          isOnline: onlineStatusMap.get(user.id) ?? false,
          relation,
        };
      })
      .filter((v): v is FriendResponseDto => v !== null);

    return this.sortFriendList(result);
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
        if (a.isOnline !== b.isOnline) {
          return a.isOnline ? -1 : 1;
        }
        return a.nickname.localeCompare(b.nickname, 'ko-KR');
      }

      return 0;
    });
  }

  async getFriendship(userId: number, targetUserId: number): Promise<Friend | null> {
    return this.friendRepository.findFriendship(userId, targetUserId);
  }

  async sendRequest(userId: number, targetUserId: number): Promise<Friend> {
    const targetUser = await this.userService.findOneById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.USER_NOT_FOUND });
    }

    if (userId === targetUserId) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.CANNOT_ADD_SELF,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.CANNOT_ADD_SELF]],
      });
    }

    const isBlockedByTarget = await this.blockService.isBlocked(targetUserId, userId);
    if (isBlockedByTarget) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.BLOCKED_BY_TARGET,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.BLOCKED_BY_TARGET]],
      });
    }

    const isBlockingTarget = await this.blockService.isBlocked(userId, targetUserId);
    if (isBlockingTarget) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.BLOCKING_TARGET,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.BLOCKING_TARGET]],
      });
    }

    const existing = await this.friendRepository.findFriendship(userId, targetUserId);
    if (existing) return existing;

    return await this.friendRepository.createFriendship(userId, targetUserId);
  }

  async cancelRequest(userId: number, targetUserId: number): Promise<void> {
    const targetUser = await this.userService.findOneById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.USER_NOT_FOUND });
    }

    const request = await this.friendRepository.findFriendship(userId, targetUserId);
    if (!request) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.REQUEST_NOT_FOUND });
    }

    if (request.status !== FriendStatus.PENDING) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.INVALID_REQUEST_STATUS,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.INVALID_REQUEST_STATUS]],
      });
    }

    if (request.requesterId !== userId) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.CANNOT_CANCEL_RECEIVED_REQUEST,
        errors: [FRIEND_DOMAIN_ERRORS.CANNOT_CANCEL_RECEIVED_REQUEST],
      });
    }

    await this.friendRepository.deleteFriendshipById(request.id);
  }

  async respondFriendRequest(
    userId: number,
    requesterId: number,
    accept: boolean,
  ): Promise<Friend | void> {
    const requester = await this.userService.findOneById(requesterId);
    if (!requester) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.USER_NOT_FOUND });
    }

    const request = await this.friendRepository.findFriendship(requesterId, userId);
    if (!request) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.REQUEST_NOT_FOUND });
    }

    if (request.status !== FriendStatus.PENDING) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.INVALID_REQUEST_STATUS,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.INVALID_REQUEST_STATUS]],
      });
    }

    if (request.requesterId !== requesterId) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.CANNOT_RESPOND_OWN_REQUEST,
        errors: [FRIEND_DOMAIN_ERRORS.CANNOT_RESPOND_OWN_REQUEST],
      });
    }

    if (!accept) {
      await this.friendRepository.deleteFriendshipById(request.id);
      return;
    }

    return await this.friendRepository.updateFriendshipStatus(request.id, FriendStatus.ACCEPTED);
  }

  async removeFriend(userId: number, friendUserId: number): Promise<void> {
    const friend = await this.userService.findOneById(friendUserId);
    if (!friend) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.USER_NOT_FOUND });
    }

    const friendship = await this.friendRepository.findFriendship(userId, friendUserId);
    if (!friendship || friendship.status !== FriendStatus.ACCEPTED) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.NOT_FRIENDS,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.NOT_FRIENDS]],
      });
    }

    await this.friendRepository.deleteFriendshipById(friendship.id);
  }
}
