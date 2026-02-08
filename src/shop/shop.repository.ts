import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IShopRepository } from './interfaces/shop-repository.interface';
import { CosmeticItem } from '@prisma/client';

@Injectable()
export class ShopRepository implements IShopRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllItems(): Promise<CosmeticItem[]> {
    return this.prisma.cosmeticItem.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findItemsByIds(ids: number[]): Promise<CosmeticItem[]> {
    return this.prisma.cosmeticItem.findMany({
      where: { id: { in: ids } },
    });
  }

  async findOwnedItemIds(userId: number): Promise<number[]> {
    const records = await this.prisma.userCosmeticItem.findMany({
      where: { userId },
      select: { cosmeticItemId: true },
    });

    return records.map((r) => r.cosmeticItemId);
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
    items: Pick<CosmeticItem, 'id' | 'price'>[],
    totalPrice: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userProfile.update({
        where: { userId },
        data: {
          coin: {
            decrement: totalPrice,
          },
        },
      });

      await tx.userCosmeticItem.createMany({
        data: items.map((item) => ({
          userId,
          cosmeticItemId: item.id,
        })),
        skipDuplicates: true,
      });
    });
  }
}
