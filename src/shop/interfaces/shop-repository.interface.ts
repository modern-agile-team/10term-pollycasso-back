import { CosmeticItem, GameItem } from '@prisma/client';

export interface IShopRepository {
  findAllCosmeticItems(): Promise<CosmeticItem[]>;
  findAllGameItems(): Promise<GameItem[]>;
  findCosmeticItemsByIds(ids: Set<number>): Promise<CosmeticItem[]>;
  findGameItemsByIds(ids: Set<number>): Promise<GameItem[]>;
  findOwnedCosmeticIds(userId: number): Promise<number[]>;
  findOwnedGameItemIds(userId: number): Promise<number[]>;
  findUserWithProfile(userId: number): Promise<{ id: number; level: number; coins: number } | null>;
  purchaseItems(
    userId: number,
    cosmeticItemIds: number[],
    gameItemQuantityMap: Map<number, number>,
    totalPrice: number,
  ): Promise<void>;
}
