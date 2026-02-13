import { CosmeticItem } from '@prisma/client';

export class WardrobeCosmeticItemDto {
  id: number;
  name: string;
  price: number;
  level: number;
  subCategory: string;
  description: string;
  image: string;
  isEquipped: boolean;

  constructor(item: CosmeticItem, isEquipped: boolean = false) {
    this.id = item.id;
    this.name = item.name;
    this.price = item.price;
    this.level = item.level;
    this.subCategory = item.subCategory;
    this.description = item.description;
    this.image = item.imagePath;
    this.isEquipped = isEquipped;
  }
}
