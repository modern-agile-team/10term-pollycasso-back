import { CosmeticItem } from '@prisma/client';

export interface IShopRepository {
  findAllItems(): Promise<CosmeticItem[]>;
  findItemsByIds(ids: Set<number>): Promise<CosmeticItem[]>;
  findOwnedItemIds(userId: number): Promise<number[]>;
  findUserWithProfile(userId: number): Promise<{ id: number; level: number; coins: number } | null>;
  purchaseItems(userId: number, items: CosmeticItem[]): Promise<void>;
}
