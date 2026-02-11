import { GameItemResponseDto } from './game-item.response.dto';

export class GameItemsResponseDto {
  items: GameItemResponseDto[];

  constructor(items: GameItemResponseDto[]) {
    this.items = items;
  }
}
