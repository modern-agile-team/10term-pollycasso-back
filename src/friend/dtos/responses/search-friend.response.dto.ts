import { OutfitDto } from 'src/common/dtos/responses/outfit-response.dto';

export class SearchFriendResponseDto {
  userId: number;
  nickname: string;
  outfit: OutfitDto;
  level: number;
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
