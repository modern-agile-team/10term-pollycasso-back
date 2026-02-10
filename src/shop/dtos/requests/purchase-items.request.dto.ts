import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsNumber, Min, ValidateNested, ArrayUnique } from 'class-validator';

export class PurchaseCosmeticItemDto {
  @IsNumber()
  @Min(1)
  itemId: number;
}

export class PurchaseGameItemDto {
  @IsNumber()
  @Min(1)
  itemId: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class PurchaseItemsRequestDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => PurchaseCosmeticItemDto)
  cosmeticItems?: PurchaseCosmeticItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => PurchaseGameItemDto)
  gameItems?: PurchaseGameItemDto[];
}
