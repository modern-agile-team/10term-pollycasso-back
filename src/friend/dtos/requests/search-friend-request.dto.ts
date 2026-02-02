import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class SearchFriendRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Matches(/^\S.*$/)
  @ApiProperty({
    description: '검색 키워드 (닉네임 또는 숫자 4자리 태그)',
    example: 'pollycasso',
  })
  keyword: string;
}
