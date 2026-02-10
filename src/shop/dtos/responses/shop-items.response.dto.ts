import { ShopItemResponseDto } from './shop-item.response.dto';

export class ShopItemsResponseDto {
  items: ShopItemResponseDto[];

  constructor(items: ShopItemResponseDto[]) {
    this.items = items;
  }
}
