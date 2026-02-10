import { GameItem } from '@prisma/client';

export class GameItemResponseDto {
  id: number;
  name: string;
  price: number;
  level: number;
  description: string;
  image: string | null;
  isOwned?: boolean;

  constructor(item: GameItem, isOwned = false) {
    this.id = item.id;
    this.name = item.name;
    this.price = item.price;
    this.level = item.level;
    this.description = item.description;
    this.image = item.imagePath;
    this.isOwned = isOwned;
  }
}
