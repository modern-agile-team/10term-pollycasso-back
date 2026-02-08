import { IsArray, ArrayNotEmpty, IsInt } from 'class-validator';

export class PurchaseItemsRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  itemIds: number[];
}
