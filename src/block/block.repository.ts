import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IBlockRepository } from './interfaces/block-repository.interface';
import { Block } from './block.entity';

@Injectable()
export class BlockRepository implements IBlockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBlockRelation(blockerId: number, blockedId: number): Promise<Block | null> {
    const record = await this.prisma.blockList.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      userId: record.blockerId,
      targetUserId: record.blockedId,
      createdAt: record.createdAt,
    };
  }

  async findBlockedUsersByBlocker(blockerId: number): Promise<{ blockedId: number }[]> {
    return this.prisma.blockList.findMany({
      where: {
        blockerId,
      },
      select: {
        blockedId: true,
      },
    });
  }

  async findBlockersByBlocked(blockedId: number): Promise<{ blockerId: number }[]> {
    return this.prisma.blockList.findMany({
      where: {
        blockedId,
      },
      select: {
        blockerId: true,
      },
    });
  }

  async createBlockRelation(blockerId: number, blockedId: number): Promise<Block> {
    const record = await this.prisma.blockList.create({
      data: {
        blockerId,
        blockedId,
      },
    });

    return {
      id: record.id,
      userId: record.blockerId,
      targetUserId: record.blockedId,
      createdAt: record.createdAt,
    };
  }

  async deleteBlockRelation(blockerId: number, blockedId: number): Promise<void> {
    await this.prisma.blockList.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });
  }
}
