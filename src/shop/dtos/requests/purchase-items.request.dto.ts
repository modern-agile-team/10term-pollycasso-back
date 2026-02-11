import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsNumber, Min, ValidateNested, ArrayUnique } from 'class-validator';

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
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  cosmeticItems?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => PurchaseGameItemDto)
  gameItems?: PurchaseGameItemDto[];
}
