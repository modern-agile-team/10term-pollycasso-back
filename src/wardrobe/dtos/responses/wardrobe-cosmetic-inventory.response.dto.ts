import { CosmeticItem } from '@prisma/client';
import { WardrobeCosmeticItemDto } from '../wardrobe-cosmetic-item.dto';

export class WardrobeCosmeticInventoryResponseDto {
  inventory: WardrobeCosmeticItemDto[];

  constructor(inventory: CosmeticItem[], equippedIds: Set<number>) {
    this.inventory = inventory.map(
      (item) => new WardrobeCosmeticItemDto(item, equippedIds.has(item.id)),
    );
  }
}
