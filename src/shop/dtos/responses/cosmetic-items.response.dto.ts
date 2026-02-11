import { CosmeticItemResponseDto } from './cosmetic-item.response.dto';

export class CosmeticItemsResponseDto {
  items: CosmeticItemResponseDto[];

  constructor(items: CosmeticItemResponseDto[]) {
    this.items = items;
  }
}
