import { CosmeticItem, GameItem, UserCosmeticItem, UserGameItem } from '@prisma/client';
import { OutfitIds } from 'src/outfit/outfit.type';

export interface IWardrobeRepository {
  findUserProfileOutfit(userId: number): Promise<OutfitIds | null>;
  findUserCosmeticInventory(
    userId: number,
  ): Promise<(UserCosmeticItem & { cosmeticItem: CosmeticItem })[]>;
  findUserConsumableInventory(userId: number): Promise<(UserGameItem & { gameItem: GameItem })[]>;
  findOwnedCosmeticIds(userId: number): Promise<number[]>;
  findCosmeticItemsByIds(ids: Set<number>): Promise<CosmeticItem[]>;
  updateUserOutfit(userId: number, outfit: OutfitIds): Promise<void>;
}
