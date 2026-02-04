import { IsNumber, Min } from 'class-validator';

export class TargetUserRequestDto {
  @IsNumber()
  @Min(1)
  targetUserId: number;
}
