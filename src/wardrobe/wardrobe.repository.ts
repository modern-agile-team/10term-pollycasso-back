import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IWardrobeRepository } from './interfaces/wardrobe-repository.interface';
import { CosmeticItem, GameItem, UserCosmeticItem, UserGameItem } from '@prisma/client';
import { OutfitIds } from 'src/outfit/outfit.type';

@Injectable()
export class WardrobeRepository implements IWardrobeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserProfileOutfit(userId: number): Promise<OutfitIds | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { outfit: true },
    });

    if (!profile?.outfit) {
      return null;
    }

    const outfit = profile.outfit;

    if (typeof outfit !== 'object' || outfit === null || !('bird' in outfit)) {
      return null;
    }

    return outfit as unknown as OutfitIds;
  }

  async findUserCosmeticInventory(
    userId: number,
  ): Promise<(UserCosmeticItem & { cosmeticItem: CosmeticItem })[]> {
    return this.prisma.userCosmeticItem.findMany({
      where: { userId },
      include: { cosmeticItem: true },
      orderBy: { cosmeticItem: { id: 'asc' } },
    });
  }

  async findUserConsumableInventory(
    userId: number,
  ): Promise<(UserGameItem & { gameItem: GameItem })[]> {
    return this.prisma.userGameItem.findMany({
      where: { userId },
      include: { gameItem: true },
      orderBy: { gameItem: { id: 'asc' } },
    });
  }

  async findOwnedCosmeticIds(userId: number): Promise<number[]> {
    const records = await this.prisma.userCosmeticItem.findMany({
      where: { userId },
      select: { cosmeticItemId: true },
    });
    return records.map((r) => r.cosmeticItemId);
  }

  async findCosmeticItemsByIds(ids: Set<number>): Promise<CosmeticItem[]> {
    if (ids.size === 0) {
      return [];
    }
    return this.prisma.cosmeticItem.findMany({
      where: { id: { in: Array.from(ids) } },
    });
  }

  async updateUserOutfit(userId: number, outfit: OutfitIds): Promise<void> {
    await this.prisma.userProfile.update({
      where: { userId },
      data: { outfit },
    });
  }
}
