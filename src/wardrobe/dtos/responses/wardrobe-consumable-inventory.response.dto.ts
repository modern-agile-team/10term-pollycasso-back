import { GameItem } from '@prisma/client';
import { WardrobeConsumableItemDto } from '../wardrobe-consumable-item.response.dto';

export class WardrobeConsumableInventoryResponseDto {
  inventory: WardrobeConsumableItemDto[];

  constructor(items: { gameItem: GameItem; quantity: number }[]) {
    this.inventory = items.map(
      (item) => new WardrobeConsumableItemDto(item.gameItem, item.quantity),
    );
  }
}
