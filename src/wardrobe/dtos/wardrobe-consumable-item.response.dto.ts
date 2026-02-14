import { GameItem } from '@prisma/client';

export class WardrobeConsumableItemDto {
  id: number;
  name: string;
  price: number;
  level: number;
  description: string;
  image: string;
  quantity: number;

  constructor(gameItem: GameItem, quantity: number) {
    this.id = gameItem.id;
    this.name = gameItem.name;
    this.price = gameItem.price;
    this.level = gameItem.level;
    this.description = gameItem.description;
    this.image = gameItem.imagePath ?? '';
    this.quantity = quantity;
  }
}
