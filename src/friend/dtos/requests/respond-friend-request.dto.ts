import { IsBoolean } from 'class-validator';

export class RespondFriendRequestDto {
  @IsBoolean()
  accept: boolean;
}
