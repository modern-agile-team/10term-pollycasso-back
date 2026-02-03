import { IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class SearchFriendRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Matches(/^\S.*$/)
  keyword: string;
}
