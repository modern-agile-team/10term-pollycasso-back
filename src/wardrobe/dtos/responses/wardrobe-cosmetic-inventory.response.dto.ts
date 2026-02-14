import { CosmeticItem } from '@prisma/client';
import { WardrobeCosmeticItemResponseDto } from '../wardrobe-cosmetic-item.response.dto';

export class WardrobeCosmeticInventoryResponseDto {
  inventory: WardrobeCosmeticItemResponseDto[];

  constructor(inventory: CosmeticItem[], equippedIds: Set<number>) {
    this.inventory = inventory.map(
      (item) => new WardrobeCosmeticItemResponseDto(item, equippedIds.has(item.id)),
    );
  }
}
