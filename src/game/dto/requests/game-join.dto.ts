import { IsInt, Min } from 'class-validator';

export class GameJoinDto {
  @IsInt()
  @Min(1)
  roomId: number;
}
