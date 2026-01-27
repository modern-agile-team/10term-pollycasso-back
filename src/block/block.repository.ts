import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IBlockRepository } from './interfaces/block-repository.interface';
import { Block } from './block.entity';

@Injectable()
export class BlockRepository implements IBlockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(userId: number, targetUserId: number): Promise<Block | null> {
    const record = await this.prisma.blockList.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: targetUserId,
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

  async create(userId: number, targetUserId: number): Promise<Block> {
    const record = await this.prisma.blockList.create({
      data: {
        blockerId: userId,
        blockedId: targetUserId,
      },
    });

    return {
      id: record.id,
      userId: record.blockerId,
      targetUserId: record.blockedId,
      createdAt: record.createdAt,
    };
  }

  async delete(userId: number, targetUserId: number): Promise<void> {
    await this.prisma.blockList.delete({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: targetUserId,
        },
      },
    });
  }
}
