import { IsInt, IsNotEmpty } from 'class-validator';

export class UseItemDto {
  @IsInt()
  @IsNotEmpty()
  itemId: number;

  @IsInt()
  @IsNotEmpty()
  targetUserId: number;
}
