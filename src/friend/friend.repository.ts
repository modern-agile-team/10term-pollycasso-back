import { FriendStatus } from '@prisma/client';
import { FriendshipData, UserProfile } from './types/friend.type';
import { IFriendRepository } from './interfaces/friend-repository.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { Friend } from './friend.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FriendRepository implements IFriendRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findFriendship(userId: number, targetUserId: number): Promise<Friend | null> {
    const record = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: userId },
        ],
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      requesterId: record.requesterId,
      receiverId: record.receiverId,
      status: record.status,
      createdAt: record.createdAt,
    };
  }

  async findFriendsWithProfiles(
    userId: number,
  ): Promise<{ friendships: FriendshipData[]; users: UserProfile[] }> {
    const friendships = await this.prisma.friend.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
    });

    const targetIds = friendships.map((f) =>
      f.requesterId === userId ? f.receiverId : f.requesterId,
    );

    if (targetIds.length === 0) {
      return { friendships: [], users: [] };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: targetIds } },
      include: { profile: true },
    });

    return { friendships, users };
  }

  async createFriendship(userId: number, targetUserId: number): Promise<Friend> {
    const record = await this.prisma.friend.create({
      data: {
        requesterId: userId,
        receiverId: targetUserId,
        status: FriendStatus.PENDING,
      },
    });

    return {
      id: record.id,
      requesterId: record.requesterId,
      receiverId: record.receiverId,
      status: record.status,
      createdAt: record.createdAt,
    };
  }

  async updateFriendshipStatus(id: number, status: FriendStatus): Promise<Friend> {
    const record = await this.prisma.friend.update({
      where: { id },
      data: { status },
    });

    return {
      id: record.id,
      requesterId: record.requesterId,
      receiverId: record.receiverId,
      status: record.status,
      createdAt: record.createdAt,
    };
  }

  async deleteFriendshipById(id: number): Promise<void> {
    await this.prisma.friend.delete({ where: { id } });
  }

  async getUserRelatedIds(userId: number): Promise<number[]> {
    const friendships = await this.prisma.friend.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: {
        requesterId: true,
        receiverId: true,
      },
    });

    return friendships.map((f) => (f.requesterId === userId ? f.receiverId : f.requesterId));
  }

  async searchUsersByType(
    searchType: 'tag' | 'nickname',
    value: string,
    excludeIds: number[],
    limit: number,
  ): Promise<UserProfile[]> {
    if (searchType === 'tag') {
      return await this.prisma.user.findMany({
        where: {
          AND: [{ tag: value }, { id: { notIn: excludeIds } }],
        },
        include: { profile: true },
        take: limit,
      });
    }

    return await this.prisma.user.findMany({
      where: {
        AND: [
          { nickname: { contains: value, mode: 'insensitive' } },
          { id: { notIn: excludeIds } },
        ],
      },
      include: { profile: true },
      take: limit,
    });
  }

  async getRandomUsersOptimized(
    userId: number,
    excludeIds: number[],
    limit: number,
  ): Promise<UserProfile[]> {
    const allExcludeIds = [userId, ...excludeIds];

    const totalCount = await this.prisma.user.count({
      where: { id: { notIn: allExcludeIds } },
    });

    if (totalCount === 0) {
      return [];
    }

    const randomOffset = Math.floor(Math.random() * Math.max(totalCount - limit, 0));

    return await this.prisma.user.findMany({
      where: { id: { notIn: allExcludeIds } },
      include: { profile: true },
      skip: randomOffset,
      take: limit,
    });
  }
}
