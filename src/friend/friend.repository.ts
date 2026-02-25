import { Friend as PrismaFriend, FriendStatus } from '@prisma/client';
import { FriendshipData, UserProfile } from './types/friend.type';
import { IFriendRepository } from './interfaces/friend-repository.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { FriendSearchType } from './constants/friend.constant';
import { paginate } from 'src/common/utils/paginate.util';
import { UserWithProfile } from 'src/user/types/user-with-profile.type';

@Injectable()
export class FriendRepository implements IFriendRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findFriendship(userId: number, targetUserId: number): Promise<FriendshipData | null> {
    const record = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: userId },
        ],
      },
    });

    return record ? this.mapToFriendshipData(record) : null;
  }

  async findFriendsWithProfiles(
    userId: number,
  ): Promise<{ friendships: FriendshipData[]; users: UserProfile[] }> {
    const friendships = await this.prisma.friend.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      include: {
        requester: { include: { profile: true } },
        receiver: { include: { profile: true } },
      },
    });

    if (!friendships.length) return { friendships: [], users: [] };

    const userProfiles: UserProfile[] = friendships.map((f) => {
      const targetUser = f.requesterId === userId ? f.receiver : f.requester;
      return {
        id: targetUser.id,
        nickname: targetUser.nickname,
        tag: targetUser.tag,
        profile: targetUser.profile
          ? { outfit: targetUser.profile.outfit, level: targetUser.profile.level }
          : null,
      };
    });

    return {
      friendships: friendships.map((f) => this.mapToFriendshipData(f)),
      users: userProfiles,
    };
  }

  async findBlockedUsersWithProfiles(userId: number): Promise<UserProfile[]> {
    const blockedRecords = await this.prisma.blockList.findMany({
      where: { blockerId: userId },
      include: { blocked: { include: { profile: true } } },
    });

    return blockedRecords.map((r) => ({
      id: r.blocked.id,
      nickname: r.blocked.nickname,
      tag: r.blocked.tag,
      profile: r.blocked.profile
        ? { outfit: r.blocked.profile.outfit, level: r.blocked.profile.level }
        : null,
    }));
  }

  async createFriendship(userId: number, targetUserId: number): Promise<FriendshipData> {
    const record = await this.prisma.friend.create({
      data: {
        requesterId: userId,
        receiverId: targetUserId,
        status: FriendStatus.PENDING,
      },
    });

    return this.mapToFriendshipData(record);
  }

  async updateFriendshipStatus(id: number, status: FriendStatus): Promise<FriendshipData> {
    const record = await this.prisma.friend.update({
      where: { id },
      data: { status },
    });

    return this.mapToFriendshipData(record);
  }

  async deleteFriendshipById(id: number): Promise<void> {
    await this.prisma.friend.delete({ where: { id } });
  }

  async getRelatedUserIds(userId: number): Promise<number[]> {
    const friendships = await this.prisma.friend.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: { requesterId: true, receiverId: true },
    });

    return friendships.map((f) => (f.requesterId === userId ? f.receiverId : f.requesterId));
  }

  async searchUsersByKeyword(
    searchType: FriendSearchType,
    value: string,
    excludeIds: number[],
    limit: number,
    cursor?: number,
  ): Promise<{ data: UserProfile[]; hasNextPage: boolean; nextCursor: number | null }> {
    const where = this.buildSearchWhereClause(searchType, value, excludeIds);

    const users = await this.prisma.user.findMany({
      where,
      include: { profile: true },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'asc' },
    });

    const userProfiles: UserProfile[] = users.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      tag: u.tag,
      profile: u.profile ? { outfit: u.profile.outfit, level: u.profile.level } : null,
    }));

    return paginate(userProfiles, limit);
  }

  async getRecommendationCandidates(
    excludeIds: number[],
    limit: number,
    offset: number,
  ): Promise<UserProfile[]> {
    const users = await this.prisma.user.findMany({
      where: { id: { notIn: excludeIds } },
      include: { profile: true },
      skip: offset,
      take: limit,
      orderBy: { id: 'asc' },
    });

    return this.mapToUserProfiles(users);
  }

  async countRecommendationCandidates(excludeIds: number[]): Promise<number> {
    return this.prisma.user.count({
      where: { id: { notIn: excludeIds } },
    });
  }

  async deleteFriendshipIfExists(userId: number, targetUserId: number): Promise<void> {
    await this.prisma.friend.deleteMany({
      where: {
        OR: [
          { requesterId: userId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: userId },
        ],
      },
    });
  }

  private mapToFriendshipData(record: PrismaFriend): FriendshipData {
    return {
      id: record.id,
      requesterId: record.requesterId,
      receiverId: record.receiverId,
      status: record.status,
      createdAt: record.createdAt,
    };
  }

  private buildSearchWhereClause(
    searchType: FriendSearchType,
    value: string,
    excludeIds: number[],
  ) {
    return {
      AND: [
        searchType === FriendSearchType.TAG
          ? { tag: value }
          : { nickname: { contains: value, mode: 'insensitive' as const } },
        { id: { notIn: excludeIds } },
      ],
    };
  }

  private mapToUserProfiles(users: UserWithProfile[]): UserProfile[] {
    return users.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      tag: u.tag,
      profile: u.profile ? { outfit: u.profile.outfit, level: u.profile.level } : null,
    }));
  }
}
