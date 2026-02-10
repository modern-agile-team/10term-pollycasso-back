import { IsArray, ArrayNotEmpty, IsInt, ArrayUnique } from 'class-validator';

export class PurchaseItemsRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  itemIds: number[];
}
