import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FriendStatus } from '@prisma/client';
import { Friend } from './friend.entity';
import { IFriendRepository } from './interfaces/friend-repository.interface';

@Injectable()
export class FriendRepository implements IFriendRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findFriendship(userId: number, targetUserId: number): Promise<Friend | null> {
    const record = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { userId, targetUserId },
          { userId: targetUserId, targetUserId: userId },
        ],
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      requesterId: record.userId,
      receiverId: record.targetUserId,
      status: record.status,
      createdAt: record.createdAt,
    };
  }

  async create(userId: number, targetUserId: number): Promise<Friend> {
    const record = await this.prisma.friend.create({
      data: {
        userId,
        targetUserId,
        status: FriendStatus.PENDING,
      },
    });

    return {
      id: record.id,
      requesterId: record.userId,
      receiverId: record.targetUserId,
      status: record.status,
      createdAt: record.createdAt,
    };
  }

  async updateStatus(id: number, status: FriendStatus): Promise<Friend> {
    const record = await this.prisma.friend.update({
      where: { id },
      data: { status },
    });

    return {
      id: record.id,
      requesterId: record.userId,
      receiverId: record.targetUserId,
      status: record.status,
      createdAt: record.createdAt,
    };
  }

  async deleteById(id: number): Promise<void> {
    await this.prisma.friend.delete({ where: { id } });
  }

  async deleteBidirectional(userId: number, targetUserId: number): Promise<void> {
    await this.prisma.friend.deleteMany({
      where: {
        status: FriendStatus.ACCEPTED,
        OR: [
          { userId, targetUserId },
          { userId: targetUserId, targetUserId: userId },
        ],
      },
    });
  }
}
