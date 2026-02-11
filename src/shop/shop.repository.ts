import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IShopRepository } from './interfaces/shop-repository.interface';
import { CosmeticItem, GameItem } from '@prisma/client';

@Injectable()
export class ShopRepository implements IShopRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllCosmeticItems(): Promise<CosmeticItem[]> {
    return this.prisma.cosmeticItem.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findAllGameItems(): Promise<GameItem[]> {
    return this.prisma.gameItem.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findCosmeticItemsByIds(ids: Set<number>): Promise<CosmeticItem[]> {
    if (ids.size === 0) {
      return [];
    }

    return this.prisma.cosmeticItem.findMany({
      where: { id: { in: Array.from(ids) } },
    });
  }

  async findGameItemsByIds(ids: Set<number>): Promise<GameItem[]> {
    if (ids.size === 0) {
      return [];
    }

    return this.prisma.gameItem.findMany({
      where: { id: { in: Array.from(ids) } },
    });
  }

  async findOwnedCosmeticIds(userId: number): Promise<number[]> {
    const records = await this.prisma.userCosmeticItem.findMany({
      where: { userId },
      select: { cosmeticItemId: true },
    });

    return records.map((r) => r.cosmeticItemId);
  }

  async findOwnedGameItemIds(userId: number): Promise<number[]> {
    const records = await this.prisma.userGameItem.findMany({
      where: { userId },
      select: { gameItemId: true },
    });

    return records.map((r) => r.gameItemId);
  }

  async findUserWithProfile(
    userId: number,
  ): Promise<{ id: number; level: number; coins: number } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          select: {
            level: true,
            coin: true,
          },
        },
      },
    });

    if (!user || !user.profile) return null;

    return {
      id: user.id,
      level: user.profile.level,
      coins: user.profile.coin,
    };
  }

  async purchaseItems(
    userId: number,
    cosmeticItemIds: number[],
    gameItemQuantityMap: Map<number, number>,
    totalPrice: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userProfile.update({
        where: { userId },
        data: { coin: { decrement: totalPrice } },
      });

      if (cosmeticItemIds.length > 0) {
        await tx.userCosmeticItem.createMany({
          data: cosmeticItemIds.map((id) => ({ userId, cosmeticItemId: id })),
          skipDuplicates: true,
        });
      }

      for (const [gameItemId, quantity] of gameItemQuantityMap) {
        await tx.userGameItem.upsert({
          where: { userId_gameItemId: { userId, gameItemId } },
          create: { userId, gameItemId, quantity },
          update: { quantity: { increment: quantity } },
        });
      }
    });
  }
}
