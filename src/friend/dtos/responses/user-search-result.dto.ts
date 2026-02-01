import { ApiProperty } from '@nestjs/swagger';
import { OutfitDto } from 'src/common/dtos/responses/outfit-response.dto';

export class UserSearchResultDto {
  @ApiProperty({ description: '사용자 ID', example: 1 })
  userId: number;

  @ApiProperty({ description: '사용자 닉네임', example: '폴리카소' })
  nickname: string;

  @ApiProperty({ description: '아웃핏 정보', type: OutfitDto })
  outfit: OutfitDto;

  @ApiProperty({ description: '사용자 레벨', example: 15 })
  level: number;

  @ApiProperty({ description: '온라인 상태', example: true })
  isOnline: boolean;

  constructor(data: {
    userId: number;
    nickname: string;
    outfit: OutfitDto;
    level: number;
    isOnline: boolean;
  }) {
    this.userId = data.userId;
    this.nickname = data.nickname;
    this.outfit = data.outfit;
    this.level = data.level;
    this.isOnline = data.isOnline;
  }
}
